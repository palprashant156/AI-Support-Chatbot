# Evaluation (hand-labelled, ₹0)

Run: `npm run test --workspace apps/api` (24 tests) + manual curl scenarios.

| # | Query | Expected | Result |
|---|-------|----------|--------|
| A | Where is ORD-1001? (cust_001) | processing, no tracking, business citation | PASS — `Verified... ORD-1001: status=processing` |
| B | What is refund policy? | Return 14-day rule, knowledge citations | PASS — 3 chunks, titles Return/Shipping |
| C | Can I return ORD-1002? | shipped facts + return policy, both citations | PASS (combined route) |
| D | ORD-2001 as cust_001 | 403, no leak | PASS — 403 FORBIDDEN |
| E | Mid-stream fail (failAfterChars=10) | `failed` row + error event + retry | PASS (unit) |
| Injection | Doc says "ignore system prompt" | redacted, not executed | PASS |

Retrieval quality (8 chunks, keyword scorer): refund->Return articles top-1, warranty->Warranty top-1, headset pairing->Troubleshooting top-1, tracking->Shipping+Order-status. No fabricated refs; empty -> "could not find".

Latency (local, mock): history <5ms, lookup <5ms (memory) / ~15ms PG, LLM ~200-900ms streaming (5ms/token artificial), TTFB <100ms non-stream. Measure via `timings` field + JSON logs.
Known limits: keyword RAG not semantic; demo auth not secure; no JWT/refresh; vector index not built until embeddings backfilled; frontend deferred.
