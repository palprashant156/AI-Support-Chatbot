# SupportFlow AI — Intelligent Customer Support Platform

Modular monolith: React (later) + Express + TypeScript + PostgreSQL + pgvector + LLM behind interface.

## Status

Backend MVP (Phases 0–8, 10–12) + Frontend workspace (Phase 9) matching `frontend-design/screen1-3.png`.

## Quickstart (backend + frontend)

```bash
createdb supportflow
cp .env.example .env
npm install
npm run migrate --workspace apps/api
npm run seed --workspace apps/api
npm run dev --workspace apps/api   # :3001
npm run dev --workspace apps/web   # :5173, proxies /api -> :3001
```

## Structure

```
apps/api/src/
  config/ routes/ controllers/ services/ repositories/
  conversations/ chat/orchestrator chat/context chat/prompts chat/streaming
  knowledge/ customers/ orders/ products/ tickets/ ai/
  middleware/ errors/ database/
database/migrations/ seeds/
docs/architecture decisions api/
tests in apps/api/tests/
```

## Key contracts

- `LlmClient` interface — `MockLlmClient` default, `GeminiLlmClient` when `LLM_PROVIDER=gemini` + key.
- SSE events: `message_start, text_delta, citations, message_complete, error`.
- Ownership: every conversation/order/ticket lookup checks `customer_id`. Demo auth via `x-customer-id` header (NOT production auth).

## Test

```bash
npm run test --workspace apps/api
```

See `docs/` for architecture, streaming, prompts, API, decisions.
