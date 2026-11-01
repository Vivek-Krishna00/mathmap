import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error', err);
});

/** Run a query, returning the full result object. */
export function query(text, params) {
  return pool.query(text, params);
}

/** Run a query, returning the first row or null. */
export async function one(text, params) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}

/** Run a query, returning all rows. */
export async function many(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

/** Run `fn` inside a transaction; rolls back on any thrown error. */
export async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore rollback failure */
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
