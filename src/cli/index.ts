import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCliArgs } from './parse-args';

function readVersion(): string {
  try {
    const raw = readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/** Returns a process exit code, or -1 to signal "server started, keep running". */
export async function main(argv: string[]): Promise<number> {
  const parsed = parseCliArgs(argv, { version: readVersion() });

  if (parsed.kind === 'help') {
    process.stdout.write(`${parsed.text}\n`);
    return 0;
  }
  if (parsed.kind === 'version') {
    process.stdout.write(`${parsed.text}\n`);
    return 0;
  }
  if (parsed.kind === 'error') {
    process.stderr.write(`${parsed.message}\n`);
    return 1;
  }

  // serve
  process.env.VERBOSE = String(parsed.options.verbose);
  const { runServe, installSignalHandlers } = await import('./commands/serve');
  const { stop } = await runServe(parsed.options);
  installSignalHandlers(stop);
  return -1;
}

if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => {
      if (code >= 0) process.exit(code);
    })
    .catch((err: unknown) => {
      process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
      process.exit(1);
    });
}
