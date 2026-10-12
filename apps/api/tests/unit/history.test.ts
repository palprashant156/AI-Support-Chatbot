import { describe, it, expect } from 'vitest';
import { selectHistory } from '../../src/chat/context/contextBuilder.js';
import type { Message } from '../../src/types.js';

const msg = (i: number, content: string): Message => ({
  id: `m${i}`, conversation_id: 'c1', role: i % 2 ? 'user' : 'assistant',
  content, status: 'completed', request_id: null, citations: [],
  created_at: new Date(Date.now() + i * 1000).toISOString(), completed_at: new Date().toISOString(),
});

describe('selectHistory', () => {
  it('bounds message count', () => {
    const all = Array.from({ length: 30 }, (_, i) => msg(i, `hello ${i}`));
    expect(selectHistory(all, { maxMessages: 5 })).toHaveLength(5);
  });
  it('bounds chars and keeps newest', () => {
    const all = [msg(1, 'a'.repeat(5000)), msg(2, 'latest question')];
    const out = selectHistory(all, { maxChars: 100 });
    expect(out[out.length - 1].content).toContain('latest');
  });
  it('preserves chronological order', () => {
    const all = [msg(1, 'first'), msg(2, 'second'), msg(3, 'third')];
    const out = selectHistory(all);
    expect(out.map((m) => m.content)).toEqual(['first', 'second', 'third']);
  });
});
