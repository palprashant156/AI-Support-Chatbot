import { describe, it, expect } from 'vitest';
import { buildPrompt } from '../../src/chat/prompts/promptBuilder.js';

describe('buildPrompt', () => {
  it('orders sections deterministically and maps citations', () => {
    const { messages, citations, promptChars } = buildPrompt({
      history: [],
      knowledge: [{ id: 'kb-return-1', title: 'Return and Refund Policy', section: 'eligibility', content: '14 days', score: 5 }],
      order: { id: 'ord_1', customer_id: 'c', order_number: 'ORD-1001', status: 'processing', placed_at: '', estimated_delivery_at: null, tracking_number: null, total_cents: 100, created_at: '', updated_at: '' } as any,
      product: null, ticket: null,
      question: 'Where is ORD-1001?',
    });
    expect(messages[0].role).toBe('system');
    expect(messages[messages.length - 1].content).toContain('ORD-1001');
    expect(citations).toHaveLength(2);
    expect(citations[0].kind).toBe('knowledge');
    expect(citations[1].kind).toBe('business');
    expect(promptChars).toBeGreaterThan(100);
  });
  it('never duplicates unbounded history', () => {
    const hist: any[] = Array.from({ length: 5 }, (_, i) => ({ role: 'user', content: `q${i}` }));
    const { messages } = buildPrompt({ history: hist, knowledge: [], question: 'hi' });
    const historyBlocks = messages.filter((m) => m.content.includes('[HISTORY]'));
    expect(historyBlocks).toHaveLength(1);
  });
});
