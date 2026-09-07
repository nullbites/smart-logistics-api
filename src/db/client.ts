import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

// Prisma 7 no longer reads a connection URL from the schema; the client
// connects through a driver adapter built from the validated environment URL.
// The instance is cached on the global object so repeated imports and dev
// hot-reloads reuse one client instead of opening new connection pools.
const globalForPrisma = globalThis as unknown as { __prismaClient?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__prismaClient ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prismaClient = prisma;
}
