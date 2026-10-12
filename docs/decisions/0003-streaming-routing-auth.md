# ADR 0003 — SSE, explicit router, backend-enforced auth

Date: 2026-10-10. Status: Accepted.
- SSE over WebSockets: streaming is server->client only; SSE is plain HTTP, no extra infra.
- Deterministic `routeIntent` regex over agent framework: testable, no tool-abuse risk; model tools later with backend validation.
- Auth in SQL/service layer (`customer_id` checks + 403), never in prompt. `x-customer-id` is demo; prod needs real auth. Prompt instructions are not a security boundary.
- Partial streams persist as `interrupted/failed`, never `completed`.
