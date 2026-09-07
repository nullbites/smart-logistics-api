#!/usr/bin/env node
// Uploads each examples/network-*.json, runs its optimizations against a running
// service, and checks every result against the file's `expected` block.
//
// Usage:  node examples/run.mjs [baseUrl]
// Default baseUrl: http://localhost:3000

import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const baseUrl = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const COST_TOLERANCE = 0.01;

async function poll(jobId) {
  for (let i = 0; i < 100; i += 1) {
    const res = await fetch(`${baseUrl}/route/status/${jobId}`);
    if (res.status === 404) return { status: 'NOT_FOUND' };
    const body = await res.json();
    if (body.status !== 'PENDING' && body.status !== 'RUNNING') return body;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`job ${jobId} never settled`);
}

function checkCase(exp, submitStatus, statusBody) {
  const problems = [];
  if (exp.solvable) {
    if (submitStatus !== 202) problems.push(`submit expected 202, got ${submitStatus}`);
    if (statusBody.status !== 'COMPLETED') {
      problems.push(`status expected COMPLETED, got ${JSON.stringify(statusBody)}`);
      return problems;
    }
    const r = statusBody.result;
    if (JSON.stringify(r.path) !== JSON.stringify(exp.path)) {
      problems.push(`path expected ${JSON.stringify(exp.path)}, got ${JSON.stringify(r.path)}`);
    }
    if (Math.abs(r.totalCost - exp.totalCost) > COST_TOLERANCE) {
      problems.push(`totalCost expected ~${exp.totalCost}, got ${r.totalCost}`);
    }
  } else if (exp.status === 'FAILED') {
    if (submitStatus !== 202) problems.push(`submit expected 202, got ${submitStatus}`);
    if (statusBody.status !== 'FAILED') {
      problems.push(`status expected FAILED, got ${JSON.stringify(statusBody)}`);
      return problems;
    }
    if (statusBody.error.code !== exp.errorCode) {
      problems.push(`error code expected ${exp.errorCode}, got ${statusBody.error.code}`);
    }
  } else {
    problems.push(`unrecognised expected block: ${JSON.stringify(exp)}`);
  }
  return problems;
}

async function runFile(file) {
  const doc = JSON.parse(await readFile(join(here, file), 'utf8'));
  console.log(`\n=== ${doc.name}  (${file}) ===`);

  const up = await fetch(`${baseUrl}/network/upload`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(doc.upload),
  });
  if (up.status !== 201) {
    console.log(`  UPLOAD FAILED: ${up.status} ${await up.text()}`);
    return { pass: 0, fail: doc.optimizations.length };
  }
  const { networkId } = await up.json();
  console.log(`  network ${networkId}`);

  let pass = 0;
  let fail = 0;
  for (const opt of doc.optimizations) {
    const submit = await fetch(`${baseUrl}/route/optimize/${networkId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(opt.request),
    });
    let statusBody = { status: `submit-${submit.status}` };
    if (submit.status === 202) {
      const { jobId } = await submit.json();
      statusBody = await poll(jobId);
    }
    const problems = checkCase(opt.expected, submit.status, statusBody);
    if (problems.length === 0) {
      pass += 1;
      const got = opt.expected.solvable
        ? `${statusBody.result.path.join('->')} @ ${statusBody.result.totalCost}`
        : statusBody.error.code;
      console.log(`  PASS  ${opt.id}  (${got})`);
    } else {
      fail += 1;
      console.log(`  FAIL  ${opt.id}`);
      for (const p of problems) console.log(`          - ${p}`);
    }
  }
  return { pass, fail };
}

const files = (await readdir(here)).filter((f) => /^network-\d.*\.json$/.test(f)).sort();
let total = { pass: 0, fail: 0 };
for (const f of files) {
  const r = await runFile(f);
  total = { pass: total.pass + r.pass, fail: total.fail + r.fail };
}
console.log(`\n=== ${total.pass} passed, ${total.fail} failed ===`);
process.exit(total.fail === 0 ? 0 : 1);
