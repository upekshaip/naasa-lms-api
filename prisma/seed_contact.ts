import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in the environment variables.');
}

if (connectionString.startsWith('prisma://')) {
  throw new Error(
    'Please use your direct Neon database URL starting with postgres:// or postgresql://, not the prisma:// URL.',
  );
}

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool as any);
const prisma = new PrismaClient({ adapter });

type CsvField = 'First Name' | 'Last Name' | 'Email 1' | 'Phone 1';
type CsvRow = Partial<Record<CsvField, string>>;

function isCsvField(value: string): value is CsvField {
  return (
    value === 'First Name' ||
    value === 'Last Name' ||
    value === 'Email 1' ||
    value === 'Phone 1'
  );
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const columns = parseCsvLine(lines[i]);
    const row: CsvRow = {};

    for (let j = 0; j < headers.length; j += 1) {
      const header = headers[j];
      if (isCsvField(header)) {
        row[header] = columns[j] ?? '';
      }
    }

    rows.push(row);
  }

  return rows;
}

function cleanPhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  let p = phone.replace(/\D/g, '');

  if (p.startsWith('94') && p.length >= 11) {
    p = '0' + p.substring(2, 11);
  } else if (p.length === 9) {
    p = '0' + p;
  }

  if (p.length >= 10 && p.startsWith('0')) {
    p = p.substring(0, 10);
  }

  if (p.length === 10 && p.startsWith('0')) {
    return p;
  }

  return null;
}

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected via Neon Serverless Adapter');

    const content = await readFile('contacts.csv', 'utf8');
    const rows = parseCsv(content);

    const usersToInsert: Prisma.UserCreateManyInput[] = [];
    const uniqueEmails = new Set<string>();

    for (const row of rows) {
      const firstName = row['First Name']?.trim() ?? '';
      const lastName = row['Last Name']?.trim() ?? '';
      const fullName =
        `${firstName} ${lastName}`.trim().substring(0, 50) || null;
      const email = row['Email 1']?.trim() ?? null;
      const phone = cleanPhoneNumber(row['Phone 1'] ?? null);

      if (email && !uniqueEmails.has(email)) {
        uniqueEmails.add(email);
        usersToInsert.push({ name: fullName, email, phone });
      }
    }

    console.log(
      `Finished parsing CSV. Found ${usersToInsert.length} valid, unique users. Inserting in batches...`,
    );

    const BATCH_SIZE = 500;
    let totalInserted = 0;

    for (let i = 0; i < usersToInsert.length; i += BATCH_SIZE) {
      const batch = usersToInsert.slice(i, i + BATCH_SIZE);

      const values = batch.map((_, idx) => {
        const base = idx * 3;
        return `($${base + 1}, $${base + 2}, $${base + 3}, NOW(), NOW(), true)`;
      });

      const params: (string | null)[] = [];
      for (const user of batch) {
        params.push(user.name ?? null, user.email, user.phone ?? null);
      }

      const insertedUsers = await pool.query(
        `INSERT INTO "User" (name, email, phone, "createdAt", "updatedAt", "isStudent")
         VALUES ${values.join(', ')}
         ON CONFLICT (email) DO NOTHING
         RETURNING "userId"`,
        params,
      );

      if (insertedUsers.rows.length > 0) {
        const profileValues = insertedUsers.rows.map(
          (_: { userId: number }, idx: number) => `($${idx + 1}, 'active')`,
        );
        const profileParams = insertedUsers.rows.map(
          (row: { userId: number }) => row.userId,
        );

        await pool.query(
          `INSERT INTO "StudentProfile" ("userId", status)
           VALUES ${profileValues.join(', ')}
           ON CONFLICT ("userId") DO NOTHING`,
          profileParams,
        );
      }

      totalInserted += insertedUsers.rows.length;
      console.log(
        `Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} (${totalInserted} users so far)...`,
      );
    }

    console.log(
      `Done. Successfully inserted ${totalInserted} users with student profiles.`,
    );
  } catch (error) {
    console.error('Error inserting data:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
    console.log('Database disconnected');
  }
}

main().catch(console.error);
