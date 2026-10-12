# Prompt construction

Order (deterministic): System -> History -> Knowledge -> Business -> Question.

- System: role, grounding rules, anti-injection, read-only. Must NOT contain literal `[BUSINESS]`/`[KNOWLEDGE]` markers (they confuse parsers) — uses words "BUSINESS block".
- History: `selectHistory(max 12 msgs, 6000 chars)`, newest-first budget then chronological. Prevents cost/latency blowup.
- Knowledge: `- [chunk_id | title / section] content(≤800c)` + citation `{kind:'knowledge',...}`. Empty -> `(no relevant articles)` so model says "I don't know".
- Business: `ORDER ... status/tracking/eta` etc. + citation `{kind:'business',...}`. Only authorized fields. Empty -> `(no business records needed)`.
- Question: sliced to 2000 chars.

Inspectable: `promptChars` + `timings` returned on non-streaming turn, logged truncated. Production logs redact `content/prompt/email`.

Injection tests (see `mockLlm.test.ts`): doc with "ignore system prompt" is redacted to `[redacted untrusted instruction — ignored]`, never executed; cross-customer order throws 403 before LLM; missing fields render as `none/n/a`, model must verbalise uncertainty.
