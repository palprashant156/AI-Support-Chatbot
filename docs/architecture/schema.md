# Schema

See `database/migrations/001_init.sql`, `002_knowledge.sql`.

- `price_cents INTEGER`, `total_cents INTEGER` (no float money).
- `orders.status ∈ processing|shipped|delivered|cancelled|refunded`, `tracking_number NULL` until shipped.
- `messages.role ∈ user|assistant|system`, `status ∈ pending|completed|interrupted|failed`, `citations JSONB`, `request_id UNIQUE WHERE NOT NULL` for idempotency.
- `knowledge_chunks.embedding vector(384)` nullable — keyword fallback works until embeddings backfilled.
- Indexes: `orders(customer_id)`, `orders(order_number)`, `messages(conversation_id,created_at)`, `conversations(customer_id,updated_at)`.

Ownership rule: every read checks `row.customer_id == requester`. `x-customer-id` is demo only; prod needs JWT/session. Never duplicate business facts into messages; store citations and re-fetch live.
