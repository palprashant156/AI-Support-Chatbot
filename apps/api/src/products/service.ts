import { memory } from '../database/memory.js';
import { getPool } from '../database/db.js';
import type { Product } from '../types.js';

export async function getProduct(productId: string): Promise<Product | null> {
  const pool = getPool();
  if (pool && process.env.NODE_ENV !== 'test') {
    try {
      const r = await pool.query('SELECT * FROM products WHERE id=$1', [productId]);
      if (r.rows[0]) return r.rows[0] as Product;
    } catch { /* memory fallback */ }
  }
  return memory.products.get(productId) ?? null;
}

export async function getProductBySku(sku: string): Promise<Product | null> {
  const pool = getPool();
  if (pool && process.env.NODE_ENV !== 'test') {
    try {
      const r = await pool.query('SELECT * FROM products WHERE sku=$1', [sku]);
      if (r.rows[0]) return r.rows[0] as Product;
    } catch { /* fallback */ }
  }
  return [...memory.products.values()].find((p) => p.sku === sku) ?? null;
}
