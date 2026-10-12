import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { requestId } from './middleware/requestId.js';
import { demoAuth, requireCustomer } from './middleware/demoAuth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './errors/AppError.js';
import { getCustomer } from './customers/service.js';
import { getOrderById, listOrdersByCustomer } from './orders/service.js';
import { getProduct } from './products/service.js';
import { getTicket, listTicketsByCustomer } from './tickets/service.js';
import { searchKnowledge } from './knowledge/service.js';
import { createConversation, listConversations, getConversation, listMessages } from './conversations/service.js';
import { chatInputSchema, runChatTurn, runChatTurnStream } from './chat/orchestrator/orchestrator.js';
import { sseHeaders, sendEvent } from './chat/streaming/sse.js';
import { seedMemory } from './database/memory.js';

seedMemory();

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(requestId);
  app.use(demoAuth);
  app.use(rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, provider: process.env.LLM_PROVIDER ?? 'mock', time: new Date().toISOString() });
  });

  // ---- Customers / business APIs (mock, backed by Postgres/memory) ----
  app.get('/api/customers/:customerId', async (req, res, next) => {
    try {
      const requester = requireCustomer(req);
      const c = await getCustomer(req.params.customerId, requester);
      if (!c) throw new AppError(404, 'NOT_FOUND', 'Customer not found');
      res.json({ id: c.id, name: c.name, created_at: c.created_at });
    } catch (e) { next(e); }
  });

  app.get('/api/customers/:customerId/orders', async (req, res, next) => {
    try {
      const requester = requireCustomer(req);
      const orders = await listOrdersByCustomer(req.params.customerId, requester);
      res.json(orders.map((o) => ({
        id: o.id, order_number: o.order_number, status: o.status,
        tracking_number: o.tracking_number, estimated_delivery_at: o.estimated_delivery_at, total_cents: o.total_cents,
      })));
    } catch (e) { next(e); }
  });

  app.get('/api/customers/:customerId/tickets', async (req, res, next) => {
    try {
      const requester = requireCustomer(req);
      res.json(await listTicketsByCustomer(req.params.customerId, requester));
    } catch (e) { next(e); }
  });

  app.get('/api/orders/:orderId', async (req, res, next) => {
    try {
      const requester = requireCustomer(req);
      const o = await getOrderById(req.params.orderId, requester);
      if (!o) throw new AppError(404, 'NOT_FOUND', 'Order not found');
      res.json(o);
    } catch (e) { next(e); }
  });

  app.get('/api/products/:productId', async (req, res, next) => {
    try {
      const p = await getProduct(req.params.productId);
      if (!p) throw new AppError(404, 'NOT_FOUND', 'Product not found');
      res.json(p);
    } catch (e) { next(e); }
  });

  app.get('/api/tickets/:ticketId', async (req, res, next) => {
    try {
      const requester = requireCustomer(req);
      const t = await getTicket(req.params.ticketId, requester);
      if (!t) throw new AppError(404, 'NOT_FOUND', 'Ticket not found');
      res.json(t);
    } catch (e) { next(e); }
  });

  app.post('/api/knowledge/search', async (req, res, next) => {
    try {
      const schema = z.object({ query: z.string().min(1).max(1000), topK: z.number().int().min(1).max(10).optional() });
      const body = schema.parse(req.body);
      const results = await searchKnowledge(body.query, body.topK ?? 3);
      res.json(results.map((r) => ({ id: r.id, title: r.title, section: r.section, content: r.content, score: r.score })));
    } catch (e) { next(e); }
  });

  // ---- Conversations ----
  app.post('/api/conversations', async (req, res, next) => {
    try {
      const schema = z.object({ title: z.string().max(120).optional() });
      const body = schema.parse(req.body ?? {});
      const customerId = requireCustomer(req);
      res.status(201).json(await createConversation(customerId, body.title));
    } catch (e) { next(e); }
  });

  app.get('/api/conversations', async (req, res, next) => {
    try {
      res.json(await listConversations(requireCustomer(req)));
    } catch (e) { next(e); }
  });

  app.get('/api/conversations/:id', async (req, res, next) => {
    try {
      const c = await getConversation(req.params.id, requireCustomer(req));
      if (!c) throw new AppError(404, 'NOT_FOUND', 'Conversation not found');
      res.json(c);
    } catch (e) { next(e); }
  });

  app.get('/api/conversations/:id/messages', async (req, res, next) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 100);
      const before = req.query.before as string | undefined;
      res.json(await listMessages(req.params.id, requireCustomer(req), limit, before));
    } catch (e) { next(e); }
  });

  // Non-streaming chat turn
  app.post('/api/conversations/:id/messages', async (req, res, next) => {
    try {
      const body = chatInputSchema.parse(req.body);
      const result = await runChatTurn({
        conversationId: req.params.id,
        customerId: requireCustomer(req),
        content: body.content,
        requestId: body.requestId ?? (req as any).requestId,
      });
      res.status(201).json(result);
    } catch (e) { next(e); }
  });

  // Streaming chat turn (SSE)
  app.post('/api/conversations/:id/stream', async (req, res, next) => {
    try {
      const body = chatInputSchema.parse(req.body);
      const customerId = requireCustomer(req);
      const conversationId = req.params.id;

      sseHeaders(res);
      let closed = false;
      const abort = new AbortController();
      req.on('close', () => { closed = true; abort.abort(); });

      const messageId = `msg_stream_${Date.now()}`;
      sendEvent(res, 'message_start', { messageId, conversationId, provider: process.env.LLM_PROVIDER ?? 'mock' });

      const onToken = (delta: string) => {
        if (!closed) sendEvent(res, 'text_delta', { delta });
      };

      try {
        const result = await runChatTurnStream({
          conversationId, customerId, content: body.content,
          requestId: body.requestId ?? (req as any).requestId,
          signal: abort.signal, onToken,
        });
        if (!closed) {
          sendEvent(res, 'citations', { sources: result.citations });
          sendEvent(res, 'message_complete', { messageId: result.assistantMessageId, provider: result.provider });
          res.end();
        }
      } catch (e: any) {
        if (!closed) {
          sendEvent(res, 'error', { code: e?.code ?? 'STREAM_FAILED', message: e?.message ?? 'Stream failed', partialId: e?.partialId ?? null });
          res.end();
        }
      }
    } catch (e) { next(e); }
  });

  app.use(errorHandler);
  return app;
}
