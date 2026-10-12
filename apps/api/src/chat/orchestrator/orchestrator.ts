import { z } from 'zod';
import { appendMessage, listMessages } from '../../conversations/service.js';
import { selectHistory } from '../context/contextBuilder.js';
import { buildPrompt } from '../prompts/promptBuilder.js';
import { routeIntent } from './intentRouter.js';
import { searchKnowledge } from '../../knowledge/service.js';
import { getOrderByNumber, listOrdersByCustomer } from '../../orders/service.js';
import { getProductBySku } from '../../products/service.js';
import { getLlmClient } from '../../ai/factory.js';
import type { Citation } from '../../types.js';
import { logger } from '../../config/logger.js';

export const chatInputSchema = z.object({
  content: z.string().min(1).max(4000),
  requestId: z.string().max(64).optional(),
});

export interface OrchestratorResult {
  assistantMessageId: string;
  text: string;
  citations: Citation[];
  promptChars: number;
  provider: string;
  timings: Record<string, number>;
}

// Coordinates: validate -> persist user -> history -> lookups (bounded parallel) ->
// prompt -> LLM -> persist assistant. Does NOT stream (see routes for SSE wrapper).
export async function runChatTurn(opts: {
  conversationId: string;
  customerId: string;
  content: string;
  requestId?: string;
}): Promise<OrchestratorResult> {
  const t0 = Date.now();
  const timings: Record<string, number> = {};

  // 1) Persist user message (idempotent on requestId)
  await appendMessage({
    conversationId: opts.conversationId,
    role: 'user',
    content: opts.content,
    requestId: opts.requestId ?? null,
    requesterId: opts.customerId,
  });
  timings.persistUserMs = Date.now() - t0;

  // 2) History (bounded)
  const t1 = Date.now();
  const all = await listMessages(opts.conversationId, opts.customerId, 30);
  const history = selectHistory(all.filter((m) => m.content !== opts.content || m.role !== 'user').slice(0, -1).concat([]), { maxMessages: 12, maxChars: 6000 });
  // Simpler: use all but last user message as history
  const hist = selectHistory(all.slice(0, Math.max(0, all.length - 1)), { maxMessages: 12, maxChars: 6000 });
  timings.historyMs = Date.now() - t1;

  // 3) Route + lookups (bounded parallel, each with ownership checks)
  const t2 = Date.now();
  const decision = routeIntent(opts.content);
  const [knowledge, order, product] = await Promise.all([
    decision.needsKnowledge ? searchKnowledge(opts.content, 3) : Promise.resolve([]),
    (async () => {
      if (!decision.needsOrder) return null;
      if (decision.orderNumber) {
        try {
          return await getOrderByNumber(decision.orderNumber, opts.customerId);
        } catch (e: any) {
          if (e?.status === 403) throw e; // cross-customer -> reject regardless of model
          return null;
        }
      }
      // No explicit number: use most recent order as context (still authorized)
      const orders = await listOrdersByCustomer(opts.customerId, opts.customerId);
      return orders[0] ?? null;
    })(),
    (async () => {
      if (!decision.needsProduct) return null;
      if (decision.sku) return getProductBySku(decision.sku);
      return null;
    })(),
  ]);
  timings.lookupMs = Date.now() - t2;

  // Unauthorized order number that exists for someone else throws 403 above.
  // Unknown order number -> order null -> prompt shows no business records -> model says not found.

  // 4) Prompt
  const t3 = Date.now();
  const { messages, citations, promptChars } = buildPrompt({
    history: hist.length ? hist : history,
    knowledge,
    order,
    product: product ? { sku: product.sku, name: product.name, availability_status: product.availability_status } : null,
    question: opts.content,
  });
  timings.promptMs = Date.now() - t3;

  // 5) LLM
  const t4 = Date.now();
  const llm = getLlmClient();
  const started = Date.now();
  const { text } = await llm.complete(messages);
  timings.llmMs = Date.now() - t4;
  const finalText = text?.trim() ? text : '[mock] Empty model output — please retry.';

  // 6) Persist assistant as completed
  const saved = await appendMessage({
    conversationId: opts.conversationId,
    role: 'assistant',
    content: finalText,
    requestId: opts.requestId ? `${opts.requestId}:reply` : null,
    citations,
    requesterId: opts.customerId,
  });
  timings.totalMs = Date.now() - t0;
  logger.info('chat turn', { provider: llm.provider, promptChars, citations: citations.length, ...timings, elapsed: Date.now() - started });

  return { assistantMessageId: saved.id, text: finalText, citations, promptChars, provider: llm.provider, timings };
}

// Streaming variant: same steps but pipes tokens via onToken; persists only on success,
// or as interrupted/failed on abort/error.
export async function runChatTurnStream(opts: {
  conversationId: string;
  customerId: string;
  content: string;
  requestId?: string;
  signal?: AbortSignal;
  onToken: (delta: string) => void;
}): Promise<OrchestratorResult> {
  const t0 = Date.now();
  await appendMessage({
    conversationId: opts.conversationId, role: 'user', content: opts.content,
    requestId: opts.requestId ?? null, requesterId: opts.customerId,
  });
  const all = await listMessages(opts.conversationId, opts.customerId, 30);
  const hist = selectHistory(all.slice(0, Math.max(0, all.length - 1)), { maxMessages: 12, maxChars: 6000 });
  const decision = routeIntent(opts.content);
  const [knowledge, order, product] = await Promise.all([
    decision.needsKnowledge ? searchKnowledge(opts.content, 3) : Promise.resolve([]),
    (async () => {
      if (!decision.needsOrder) return null;
      if (decision.orderNumber) {
        try { return await getOrderByNumber(decision.orderNumber, opts.customerId); }
        catch (e: any) { if (e?.status === 403) throw e; return null; }
      }
      const orders = await listOrdersByCustomer(opts.customerId, opts.customerId);
      return orders[0] ?? null;
    })(),
    (async () => {
      if (!decision.needsProduct) return null;
      if (decision.sku) return getProductBySku(decision.sku);
      return null;
    })(),
  ]);
  const { messages, citations, promptChars } = buildPrompt({
    history: hist, knowledge, order,
    product: product ? { sku: product.sku, name: product.name, availability_status: product.availability_status } : null,
    question: opts.content,
  });
  const llm = getLlmClient();
  let full = '';
  try {
    full = await llm.stream(messages, opts.onToken, opts.signal);
  } catch (e) {
    // Persist partial as interrupted (client aborted) or failed (provider error)
    const status = opts.signal?.aborted ? 'interrupted' : 'failed';
    const partial = await appendMessage({
      conversationId: opts.conversationId, role: 'assistant',
      content: full || '(no output before failure)', status,
      requestId: opts.requestId ? `${opts.requestId}:reply` : null,
      citations, requesterId: opts.customerId,
    });
    throw Object.assign(new Error((e as Error).message), { partialId: partial.id, status });
  }
  if (opts.signal?.aborted) {
    const partial = await appendMessage({
      conversationId: opts.conversationId, role: 'assistant', content: full || '(interrupted)',
      status: 'interrupted', requestId: opts.requestId ? `${opts.requestId}:reply` : null,
      citations, requesterId: opts.customerId,
    });
    return { assistantMessageId: partial.id, text: full, citations, promptChars, provider: llm.provider, timings: { totalMs: Date.now() - t0 } };
  }
  const saved = await appendMessage({
    conversationId: opts.conversationId, role: 'assistant', content: full,
    requestId: opts.requestId ? `${opts.requestId}:reply` : null,
    citations, requesterId: opts.customerId,
  });
  return { assistantMessageId: saved.id, text: full, citations, promptChars, provider: llm.provider, timings: { totalMs: Date.now() - t0 } };
}
