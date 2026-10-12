import { memory } from '../database/memory.js';
import { getPool } from '../database/db.js';
import type { Order } from '../types.js';
import { forbidden } from '../errors/AppError.js';

async function fromPg(sql: string, params: any[]): Promise<any[] | null> {
  const pool = getPool();
  if (!pool || process.env.NODE_ENV === 'test') return null;
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch {
    return null;
  }
}

export async function getOrderById(orderId: string, requesterId: string): Promise<Order | null> {
  let order: Order | undefined;
  const rows = await fromPg('SELECT * FROM orders WHERE id=$1', [orderId]);
  order = rows?.[0] ?? memory.orders.get(orderId);
  if (!order) return null;
  if (order.customer_id !== requesterId) throw forbidden('Order belongs to another customer');
  return order;
}

export async function getOrderByNumber(orderNumber: string, requesterId: string): Promise<Order | null> {
  const rows = await fromPg('SELECT * FROM orders WHERE order_number=$1', [orderNumber]);
  const order: Order | undefined = rows?.[0] ?? [...memory.orders.values()].find((o) => o.order_number === orderNumber);
  if (!order) return null;
  if (order.customer_id !== requesterId) throw forbidden('Order belongs to another customer');
  return order;
}

export async function listOrdersByCustomer(customerId: string, requesterId: string): Promise<Order[]> {
  if (customerId !== requesterId) throw forbidden('Cannot list another customer orders');
  const rows = await fromPg('SELECT * FROM orders WHERE customer_id=$1 ORDER BY placed_at DESC', [customerId]);
  if (rows) return rows as Order[];
  return [...memory.orders.values()].filter((o) => o.customer_id === customerId);
}
