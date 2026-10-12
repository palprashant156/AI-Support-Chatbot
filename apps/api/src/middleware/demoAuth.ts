import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

// Demo ownership boundary. NOT production auth.
// Client sends x-customer-id; server treats it as claimed identity and
// enforces that it can only access its own records.
// A real deployment must replace this with signed auth (JWT/session).
export function demoAuth(req: Request, _res: Response, next: NextFunction) {
  const claimed = (req.headers['x-customer-id'] as string) || env.demoCustomerId;
  (req as any).customerId = claimed;
  next();
}

export function requireCustomer(req: Request): string {
  const id = (req as any).customerId as string | undefined;
  if (!id) throw Object.assign(new Error('Missing customer context'), { status: 401, code: 'UNAUTHORIZED' });
  return id;
}
