import { describe, it, expect } from 'vitest';
import { routeIntent } from '../../src/chat/orchestrator/intentRouter.js';

describe('routeIntent', () => {
  it('routes order numbers to order lookup', () => {
    const r = routeIntent('Where is order ORD-1001?');
    expect(r.needsOrder).toBe(true);
    expect(r.orderNumber).toBe('ORD-1001');
  });
  it('routes refund policy to knowledge', () => {
    const r = routeIntent('What is the refund policy?');
    expect(r.needsKnowledge).toBe(true);
    expect(r.intent).toBe('policy');
  });
  it('routes combined question to both', () => {
    const r = routeIntent('Can I return order ORD-1002?');
    expect(r.intent).toBe('combined');
    expect(r.needsKnowledge && r.needsOrder).toBe(true);
  });
  it('routes SKU to product lookup', () => {
    const r = routeIntent('Is SF-HEADSET-01 in stock?');
    expect(r.needsProduct).toBe(true);
  });
});
