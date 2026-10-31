import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { config } from '../config.js';

/**
 * Creates the target database (if missing) and applies db/schema.sql.
 * Safe to re-run: the schema drops and recreates all application objects.
 */

const { Client } = pg;

function parseTarget() {
  const url = new URL(config.databaseUrl);
  const dbName = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'mathmap';
  const adminUrl = new URL(config.databaseUrl);
  adminUrl.pathname = '/postgres';
  return { dbName, adminUrl: adminUrl.toString() };
}

async function ensureDatabase() {
  const { dbName, adminUrl } = parseTarget();
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (rows.length === 0) {
      // Identifier cannot be parameterized; dbName comes from our own config.
      await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
      console.log(`[migrate] created database "${dbName}"`);
    } else {
      console.log(`[migrate] database "${dbName}" already exists`);
    }
  } finally {
    await client.end();
  }
  return dbName;
}

async function applySchema() {
  const schemaPath = path.join(config.rootDir, 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  const client = new Client({ connectionString: config.databaseUrl });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

async function main() {
  const dbName = await ensureDatabase();
  await applySchema();
  console.log(`[migrate] schema applied to "${dbName}"`);
}

main().catch((err) => {
  console.error('[migrate] failed:', err.message);
  process.exit(1);
});
