import { config as loadDotenv } from 'dotenv';
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

// Load a local `.env` if one exists. dotenv does not fail when the file is
// absent (real environment variables may already be set by the shell or the
// deployment platform), so this is safe to call unconditionally. It must run
// before `process.env` is read below.
loadDotenv();

const EnvSchema = Type.Object({
  DATABASE_URL: Type.String({ minLength: 1 }),
  DATABASE_URL_TEST: Type.Optional(Type.String()),
  PORT: Type.Number({ default: 3000 }),
  HOST: Type.String({ default: '0.0.0.0' }),
  VERBOSE: Type.Boolean({ default: false }),
  ROUTE_WORKER_CONCURRENCY: Type.Number({ default: 1, minimum: 1 }),
});

export type Env = Static<typeof EnvSchema>;

// Read the named keys explicitly rather than iterating over `process.env` so
// that `noUncheckedIndexedAccess` stays satisfied. Blank values are treated as
// unset so schema defaults can take over.
function readRawEnv(): Record<string, string> {
  const raw: Record<string, string> = {};
  const pairs: ReadonlyArray<readonly [string, string | undefined]> = [
    ['DATABASE_URL', process.env.DATABASE_URL],
    ['DATABASE_URL_TEST', process.env.DATABASE_URL_TEST],
    ['PORT', process.env.PORT],
    ['HOST', process.env.HOST],
    ['VERBOSE', process.env.VERBOSE],
    ['ROUTE_WORKER_CONCURRENCY', process.env.ROUTE_WORKER_CONCURRENCY],
  ];
  for (const [key, value] of pairs) {
    if (value !== undefined && value !== '') {
      raw[key] = value;
    }
  }
  return raw;
}

function loadEnv(): Env {
  const withDefaults = Value.Default(EnvSchema, readRawEnv());
  const converted = Value.Convert(EnvSchema, withDefaults);

  if (!Value.Check(EnvSchema, converted)) {
    const offenders = new Set<string>();
    for (const error of Value.Errors(EnvSchema, converted)) {
      const name = error.path.replace(/^\//, '') || '(environment)';
      offenders.add(name === 'DATABASE_URL' ? 'DATABASE_URL is required' : `${name} is invalid`);
    }
    throw new Error(`Invalid environment: ${[...offenders].join(', ')}`);
  }

  return converted;
}

export const env: Env = loadEnv();
