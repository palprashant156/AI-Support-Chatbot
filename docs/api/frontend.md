# Frontend (Phase 9) — matches frontend-design/screen1-3.png

Stack: React 18 + Vite 5 + TS + React Router + native fetch SSE. No UI framework (₹0, lightweight).

## Screens
- `/` Chat — screen1 empty (`How can we help today?` + 4 suggestion cards + Quick Lookup/No Active Context) and screen3 active (`Order Inquiry` thread + Order card + Verified badge + streaming + Stop + Context Inspector + Retrieved Sources).
- `/customers` — screen2 metrics + filterable live table (computed from `GET /customers/:id`, `/orders`, `/tickets`; never hardcoded 1,248).
- `/knowledge` — live `POST /knowledge/search` inspector.

## Data wiring
- `src/services/api.ts` single client: `x-customer-id` header (acting-as switcher in Topbar), typed `Conversation/Message/Citation/Order/Ticket/Knowledge` contracts. Dev proxy `/api -> :3001` in `vite.config.ts`.
- `streamChat()` parses SSE `message_start/text_delta/citations/message_complete/error` incrementally via `ReadableStream`; `AbortController` powers Stop.
- `RightPanel` separates **live business** (orders/tracking/ETA/tickets, `chip.business`) from **knowledge citations** (click chip → inspect quote + score).
- States: empty, loading-history, streaming (caret + tok/s label), completed, failed + Retry, interrupted + Retry, no-orders vs load-failure, network error boxes.

## Run
```bash
npm run dev --workspace apps/web  # :5173
npm run build --workspace apps/web
```
Needs API on :3001 first.
