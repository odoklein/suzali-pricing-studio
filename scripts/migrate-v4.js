import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';

// Usage: node --env-file=.env scripts/migrate-v4.js
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required.');
  process.exit(1);
}

const dir = new URL('./migrations/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
const sql = files.map((f) => readFileSync(new URL(f, dir), 'utf8')).join(String.fromCharCode(10));
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

try {
  await client.connect();
  await client.query('begin');
  await client.query(sql);
  await client.query('commit');
  await client.query("notify pgrst, 'reload schema'");
  console.log('Migrations applied:', files.join(', '));
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error('Migration failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
