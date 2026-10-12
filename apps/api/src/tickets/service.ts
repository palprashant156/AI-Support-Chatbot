import { memory } from '../database/memory.js';
import { getPool } from '../database/db.js';
import type { Ticket } from '../types.js';
import { forbidden } from '../errors/AppError.js';

export async function getTicket(ticketId: string, requesterId: string): Promise<Ticket | null> {
  let t: Ticket | undefined;
  const pool = getPool();
  if (pool && process.env.NODE_ENV !== 'test') {
    try {
      const r = await pool.query('SELECT * FROM support_tickets WHERE id=$1', [ticketId]);
      t = r.rows[0];
    } catch { /* fallback */ }
  }
  t = t ?? memory.tickets.get(ticketId);
  if (!t) return null;
  if (t.customer_id !== requesterId) throw forbidden('Ticket belongs to another customer');
  return t;
}

export async function listTicketsByCustomer(customerId: string, requesterId: string): Promise<Ticket[]> {
  if (customerId !== requesterId) throw forbidden('Cannot list another customer tickets');
  const pool = getPool();
  if (pool && process.env.NODE_ENV !== 'test') {
    try {
      const r = await pool.query('SELECT * FROM support_tickets WHERE customer_id=$1 ORDER BY created_at DESC', [customerId]);
      return r.rows as Ticket[];
    } catch { /* fallback */ }
  }
  return [...memory.tickets.values()].filter((x) => x.customer_id === customerId);
}
