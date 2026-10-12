# Architecture — SupportFlow AI

Modular monolith. One Express deployment, explicit boundaries.

```
React (Phase 9, deferred)
  | HTTP + SSE
  v
Express app.ts
  +-- demoAuth (x-customer-id, NOT prod auth)
  +-- conversations/service (ownership, pagination, idempotency)
  +-- orders/products/tickets/customers services (ownership checks)
  +-- knowledge/service (keyword now, pgvector-ready)
  +-- chat/orchestrator (routeIntent -> parallel lookups -> buildPrompt -> LlmClient)
  +-- chat/prompts/promptBuilder (System + History + Knowledge + Business + Question)
  +-- chat/streaming/sse (message_start/text_delta/citations/message_complete/error)
  +-- ai/ (LlmClient interface, Mock default, Gemini when keyed)
Postgres + pgvector, memory fallback for tests
```

## Request lifecycle (order status example)

1. `POST /conversations/:id/stream {content:"Where is ORD-1001?"}` Zod-validated.
2. `appendMessage(user)` with requestId dedupe.
3. `listMessages` + `selectHistory(max 12, 6000 chars)`.
4. `routeIntent` -> needsOrder=true, orderNumber=ORD-1001.
5. `getOrderByNumber` checks `customer_id==requester`, throws 403 otherwise.
6. `buildPrompt` deterministic order, citations list.
7. `LlmClient.stream` tokens -> `text_delta` events.
8. On success persist assistant `completed` + citations; on abort `interrupted`; on error `failed`.
9. `GET /conversations/:id/messages` reopens later.

## Trade-offs

- SSE over WebSockets: one-way streaming over HTTP, no extra infra, auto-reconnect via EventSource.
- Explicit router over agent framework: testable regex, ₹0, no prompt-injection tool abuse. Model-assisted tools later, backend still validates.
- Mock LLM default: deterministic tests, no quota. Gemini behind interface.
- Keyword RAG now, `vector(384)` column ready; real embeddings plug into `knowledge/service.ts` without changing orchestrator.
- Memory store mirrors Postgres schema so `NODE_ENV=test` runs without DB; dev uses real Postgres.
