// Prisma 7 configuration.
//
// Prisma 7 no longer reads the `prisma` block from package.json and no longer
// auto-loads `.env`, so environment variables must be loaded explicitly here.
// Requires `prisma` and `dotenv` to be installed.
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
