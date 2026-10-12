import type { Message } from '../../types.js';

// Bounded history: newest N messages within char budget, chronological output.
// Prevents unbounded prompt growth (cost/latency/hallucination).
export function selectHistory(messages: Message[], opts: { maxMessages?: number; maxChars?: number } = {}): Message[] {
  const maxMessages = opts.maxMessages ?? 12;
  const maxChars = opts.maxChars ?? 6000;
  const recent = messages.slice(-maxMessages);
  let chars = 0;
  const picked: Message[] = [];
  for (let i = recent.length - 1; i >= 0; i--) {
    const m = recent[i];
    chars += m.content.length;
    if (chars > maxChars && picked.length > 0) break;
    picked.unshift(m);
  }
  return picked;
}

export function formatHistory(messages: Message[]): string {
  return messages.map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 1000)}`).join('\n');
}
