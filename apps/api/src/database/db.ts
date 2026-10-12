import { Pool } from 'pg';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let pool: Pool | null = null;

export function getPool(): Pool | null {
  const url = process.env.NODE_ENV === 'test' ? (env.testDatabaseUrl || env.databaseUrl) : env.databaseUrl;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 10 });
    pool.on('error', (e) => logger.error('pg pool error', { error: String(e) }));
  }
  return pool;
}

export async function pgAvailable(): Promise<boolean> {
  const p = getPool();
  if (!p) return false;
  try {
    await p.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Parameterized query helper — always use $1 placeholders, never string concat.
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const p = getPool();
  if (!p) throw new Error('Postgres not configured');
  const res = await p.query(text, params);
  return res.rows as T[];
}
