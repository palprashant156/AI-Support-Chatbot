import { memory } from '../database/memory.js';
import { getPool } from '../database/db.js';
import type { Customer } from '../types.js';
import { forbidden } from '../errors/AppError.js';

// Ownership: a customer may only read their own record.
export async function getCustomer(customerId: string, requesterId: string): Promise<Customer | null> {
  if (customerId !== requesterId) throw forbidden('Cannot access another customer record');
  const pool = getPool();
  if (pool && process.env.NODE_ENV !== 'test') {
    try {
      const r = await pool.query('SELECT id,name,email,created_at FROM customers WHERE id=$1', [customerId]);
      if (r.rows[0]) return r.rows[0] as Customer;
    } catch { /* fall through to memory */ }
  }
  return memory.customers.get(customerId) ?? null;
}
