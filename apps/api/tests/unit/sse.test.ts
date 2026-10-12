import { describe, it, expect } from 'vitest';
import { encodeStreamForTest } from '../../src/chat/streaming/sse.js';

describe('SSE encoding', () => {
  it('frames events with JSON data', () => {
    const out = encodeStreamForTest([
      { event: 'message_start', data: { messageId: 'm1' } },
      { event: 'text_delta', data: { delta: 'hi' } },
      { event: 'message_complete', data: { messageId: 'm1' } },
    ]);
    expect(out).toContain('event: text_delta');
    expect(out).toContain('data: {"delta":"hi"}');
  });
});
