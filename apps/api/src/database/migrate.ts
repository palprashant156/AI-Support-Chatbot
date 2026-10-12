import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './db.js';
import { logger } from '../config/logger.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// apps/api/src/database -> project root database/migrations
const migrationsDir = path.resolve(here, '../../../../database/migrations');

export async function migrate() {
  const pool = getPool();
  if (!pool) {
    logger.warn('DATABASE_URL missing, skipping Postgres migrations (using memory store)');
    return;
  }
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
    logger.info('applying migration', { file: f });
    await pool.query(sql);
  }
  logger.info('migrations complete', { count: files.length });
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  migrate().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
