# Streaming contract

Transport: SSE (`Content-Type: text/event-stream`). Chunks are words (mock) or ~24-char slices (gemini shim), NOT sentences — client must concatenate `delta`s.

Server:
- `sseHeaders(res)` disables buffering, `sendEvent` JSON-encodes data.
- `req.on('close')` aborts LLM via AbortController; partial persisted as `interrupted`.
- Provider throw mid-stream -> persist `failed` + `error` event with `partialId`.
- Only `message_complete` means `completed` row. Never persist partial as completed.

Client (Phase 9):
- Use `fetch` + `ReadableStream` + `getReader`, split on `\n\n`, parse `event:`/`data:`.
- Show `message_start` spinner (time-to-first-token), append `text_delta`, render `citations` separately (knowledge vs business), offer Retry on `error`, Stop button calls `AbortController.abort()`.

Sequence:
```
Browser --POST /stream--> Server: message_start
Server --text_delta*--> Browser (render incrementally)
Server: persist assistant
Server --citations + message_complete--> Browser
(or --error--> Browser on failure)
```
