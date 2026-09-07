import { type FastifyInstance } from 'fastify';
import { buildApp } from '../app';
import { prisma } from '../../db/client';

let settleWasNeeded = false;

async function readRows() {
  return prisma.requestLog.findMany({ orderBy: { id: 'asc' } });
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Read the audit rows once `inject` has resolved. Fastify's `inject` does not
 * wait for async `onResponse` hooks, and the hook here performs a database
 * write, so poll briefly until the expected rows have committed.
 */
async function readRowsSettled(expected: number) {
  let rows = await readRows();
  if (rows.length < expected) {
    settleWasNeeded = true;
    for (let attempt = 0; attempt < 40 && rows.length < expected; attempt += 1) {
      await delay(25);
      rows = await readRows();
    }
  }
  return rows;
}

describe('HTTP audit log', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
    console.log(`audit.test: polling for onResponse row was needed = ${settleWasNeeded}`);
  });

  it('records a single row for an unmatched GET', async () => {
    await app.inject({ method: 'GET', url: '/nonexistent' });

    const rows = await readRowsSettled(1);
    expect(rows).toHaveLength(1);

    const row = rows[0];
    expect(row?.method).toBe('GET');
    expect(row?.path).toBe('/nonexistent');
    expect(row?.statusCode).toBe(404);
    expect(typeof row?.durationMs).toBe('number');
    expect(row?.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof row?.ip).toBe('string');
    expect((row?.ip ?? '').length).toBeGreaterThan(0);
  });

  it('skips GET /health', async () => {
    await app.inject({ method: 'GET', url: '/health' });

    await delay(200);
    const rows = await readRows();
    expect(rows).toHaveLength(0);
  });

  it('skips GET /docs/json', async () => {
    await app.inject({ method: 'GET', url: '/docs/json' });

    await delay(200);
    const rows = await readRows();
    expect(rows).toHaveLength(0);
  });

  it('captures a JSON request body on an unmatched POST', async () => {
    await app.inject({
      method: 'POST',
      url: '/nonexistent',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ hello: 'world' }),
    });

    const rows = await readRowsSettled(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.requestBody).toEqual({ hello: 'world' });
  });

  it('captures the error envelope as the response body', async () => {
    await app.inject({ method: 'GET', url: '/nonexistent' });

    const rows = await readRowsSettled(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.responseBody).toMatchObject({
      error: { code: 'NOT_FOUND' },
    });
  });
});
