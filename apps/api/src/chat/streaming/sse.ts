import type { Response } from 'express';

// SSE event contract (documented in docs/api/streaming.md):
//   message_start {messageId} -> text_delta {delta}* -> citations {sources} -> message_complete {messageId}
//   error {code,message} on failure. All data frames are JSON-encoded.
export type SseEvent = 'message_start' | 'text_delta' | 'citations' | 'message_complete' | 'error';

export function sseHeaders(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
}

export function sendEvent(res: Response, event: SseEvent, data: unknown): boolean {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

export function encodeStreamForTest(events: Array<{ event: SseEvent; data: unknown }>): string {
  return events.map((e) => `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`).join('');
}
