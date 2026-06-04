import 'dotenv/config';
import { defineConfig, env } from '@prisma/config';

console.log(env('DATABASE_URL'));
console.log(process.env.DATABASE_URL);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx db/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL || env('DATABASE_URL'),
  },
});
