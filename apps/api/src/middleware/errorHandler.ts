import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../config/logger.js';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err?.status ?? 500;
  const code = err?.code ?? 'INTERNAL_ERROR';
  // Never leak stack/SQL internals to client
  const message = status >= 500 ? 'Internal server error' : (err?.message ?? 'Error');
  logger.error('request failed', { path: req.path, status, code, requestId: (req as any).requestId });
  res.status(status).json({ error: { code, message, requestId: (req as any).requestId } });
}
