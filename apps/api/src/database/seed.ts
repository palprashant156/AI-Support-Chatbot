import { getPool } from './db.js';
import { memory, seedMemory } from './memory.js';
import { logger } from '../config/logger.js';

// Seeds both memory store and Postgres (if configured) with identical demo data.
export async function seed() {
  seedMemory();
  const pool = getPool();
  if (!pool) {
    logger.info('seeded memory store only (no DATABASE_URL)');
    return;
  }
  const c = [...memory.customers.values()];
  for (const x of c) {
    await pool.query(
      `INSERT INTO customers(id,name,email) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET name=$2,email=$3`,
      [x.id, x.name, x.email],
    );
  }
  for (const p of memory.products.values()) {
    await pool.query(
      `INSERT INTO products(id,sku,name,description,price_cents,availability_status) VALUES($1,$2,$3,$4,$5,$6)
       ON CONFLICT(id) DO UPDATE SET sku=$2,name=$3,description=$4,price_cents=$5,availability_status=$6`,
      [p.id, p.sku, p.name, p.description, p.price_cents, p.availability_status],
    );
  }
  for (const o of memory.orders.values()) {
    await pool.query(
      `INSERT INTO orders(id,customer_id,order_number,status,placed_at,estimated_delivery_at,tracking_number,total_cents)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(id) DO UPDATE SET customer_id=$2,order_number=$3,status=$4,estimated_delivery_at=$6,tracking_number=$7,total_cents=$8,updated_at=now()`,
      [o.id, o.customer_id, o.order_number, o.status, o.placed_at, o.estimated_delivery_at, o.tracking_number, o.total_cents],
    );
  }
  for (const t of memory.tickets.values()) {
    await pool.query(
      `INSERT INTO support_tickets(id,customer_id,order_id,subject,status,priority,description)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(id) DO UPDATE SET customer_id=$2,order_id=$3,subject=$4,status=$5,priority=$6,description=$7,updated_at=now()`,
      [t.id, t.customer_id, t.order_id, t.subject, t.status, t.priority, t.description],
    );
  }
  for (const k of memory.knowledge.values()) {
    await pool.query(
      `INSERT INTO knowledge_chunks(id,title,section,content) VALUES($1,$2,$3,$4)
       ON CONFLICT(id) DO UPDATE SET title=$2,section=$3,content=$4`,
      [k.id, k.title, k.section, k.content],
    );
  }
  logger.info('seed complete', { customers: c.length });
}

if (process.argv[1]?.endsWith('seed.ts')) {
  seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
