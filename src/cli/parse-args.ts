import { parseArgs } from 'node:util';

export interface ServeOptions {
  port: number;
  host: string;
  verbose: boolean;
  migrate: boolean;
  seed: boolean;
}

export type ParseResult =
  | { kind: 'help'; text: string }
  | { kind: 'version'; text: string }
  | { kind: 'error'; message: string }
  | { kind: 'serve'; options: ServeOptions };

export const USAGE: string = [
  'Usage: smart-logistics [serve] [options]',
  '',
  'Options:',
  '  -h, --help          show this help and exit',
  '  -V, --version       print the version and exit',
  '  -v, --verbose       enable verbose logging',
  '  -p, --port <n>      port to listen on (default 3000, or $PORT)',
  '  -H, --host <addr>   host to bind (default 0.0.0.0, or $HOST)',
  '      --migrate       run database migrations before starting',
  '      --seed          run the database seed before starting',
].join('\n');

export function parseCliArgs(argv: string[], meta: { version: string }): ParseResult {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'V' },
        verbose: { type: 'boolean', short: 'v' },
        port: { type: 'string', short: 'p' },
        host: { type: 'string', short: 'H' },
        migrate: { type: 'boolean' },
        seed: { type: 'boolean' },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { kind: 'error', message: `${message}\n\n${USAGE}` };
  }

  const { values, positionals } = parsed;

  if (values.help === true) {
    return { kind: 'help', text: USAGE };
  }

  if (values.version === true) {
    return { kind: 'version', text: meta.version };
  }

  const command = positionals[0];
  if (command !== undefined && command !== 'serve') {
    return { kind: 'error', message: `unknown command: ${command}\n\n${USAGE}` };
  }

  const rawPort = values.port ?? process.env.PORT ?? '3000';
  const port = Number(rawPort);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    return { kind: 'error', message: `invalid port: ${rawPort}` };
  }

  const options: ServeOptions = {
    port,
    host: values.host ?? process.env.HOST ?? '0.0.0.0',
    verbose: values.verbose === true,
    migrate: values.migrate === true,
    seed: values.seed === true,
  };

  return { kind: 'serve', options };
}
