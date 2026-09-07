import { execSync } from 'node:child_process';
import { Client } from 'pg';

const TEST_URL_FALLBACK =
  'postgresql://logistics:logistics@localhost:5432/logistics_test?schema=public';

function resolveTestUrl(): string {
  return process.env.DATABASE_URL_TEST ?? TEST_URL_FALLBACK;
}

function maintenanceUrl(testUrl: string): string {
  const parsed = new URL(testUrl);
  parsed.pathname = '/logistics';
  return parsed.toString();
}

function testDatabaseName(testUrl: string): string {
  return new URL(testUrl).pathname.replace(/^\//, '') || 'logistics_test';
}

async function ensureDatabaseExists(testUrl: string): Promise<void> {
  const client = new Client({ connectionString: maintenanceUrl(testUrl) });
  await client.connect();
  try {
    await client.query(`CREATE DATABASE "${testDatabaseName(testUrl)}"`);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== '42P04') {
      throw err;
    }
  } finally {
    await client.end();
  }
}

export default async function globalSetup(): Promise<void> {
  const testUrl = resolveTestUrl();

  await ensureDatabaseExists(testUrl);

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });
}
