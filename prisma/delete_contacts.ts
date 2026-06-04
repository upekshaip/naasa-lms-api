import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment variables.');
}

const pool = new Pool({ connectionString });

async function main() {
  try {
    console.log('Connecting to database...');

    const profileResult = await pool.query(
      `DELETE FROM "StudentProfile"
       WHERE "userId" IN (
         SELECT "userId" FROM "User" WHERE "userId" >= $1
       )`,
      [17],
    );
    console.log(`Deleted ${profileResult.rowCount} student profiles.`);

    const userResult = await pool.query(
      `DELETE FROM "User" WHERE "userId" >= $1`,
      [17],
    );
    console.log(`Deleted ${userResult.rowCount} users.`);

    console.log('Done.');
  } catch (error) {
    console.error('Error deleting data:', error);
  } finally {
    await pool.end();
    console.log('Database disconnected');
  }
}

main().catch(console.error);
