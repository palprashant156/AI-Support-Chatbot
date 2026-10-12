import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { seedMemory } from '../../src/database/memory.js';

const app = createApp();
const A = 'cust_demo_001';
const B = 'cust_demo_002';

beforeEach(() => seedMemory());

describe('health', () => {
  it('returns ok', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
  });
});

describe('conversations', () => {
  it('creates, lists, loads, paginates messages, rejects cross-customer', async () => {
    const created = await request(app).post('/api/conversations').set('x-customer-id', A).send({});
    expect(created.status).toBe(201);
    const id = created.body.id;

    const listed = await request(app).get('/api/conversations').set('x-customer-id', A);
    expect(listed.body.some((c: any) => c.id === id)).toBe(true);

    // other customer cannot read
    const forbidden = await request(app).get(`/api/conversations/${id}`).set('x-customer-id', B);
    expect(forbidden.status).toBe(403);

    // non-streaming chat turn persists user + assistant
    const turn = await request(app).post(`/api/conversations/${id}/messages`).set('x-customer-id', A).send({ content: 'Where is order ORD-1001?' });
    expect(turn.status).toBe(201);
    expect(turn.body.text).toContain('ORD-1001');
    expect(turn.body.citations.length).toBeGreaterThan(0);

    const msgs = await request(app).get(`/api/conversations/${id}/messages`).set('x-customer-id', A);
    expect(msgs.body.length).toBe(2);
    expect(msgs.body[0].role).toBe('user');
  });

  it('prevents duplicate submissions via requestId', async () => {
    const created = await request(app).post('/api/conversations').set('x-customer-id', A).send({});
    const id = created.body.id;
    const rid = 'req-dedupe-1';
    await request(app).post(`/api/conversations/${id}/messages`).set('x-customer-id', A).send({ content: 'hi policy refund?', requestId: rid });
    await request(app).post(`/api/conversations/${id}/messages`).set('x-customer-id', A).send({ content: 'hi policy refund?', requestId: rid });
    const msgs = await request(app).get(`/api/conversations/${id}/messages`).set('x-customer-id', A);
    const users = msgs.body.filter((m: any) => m.role === 'user');
    expect(users).toHaveLength(1);
  });
});

describe('business APIs + ownership', () => {
  it('returns own order, rejects чужой order', async () => {
    const ok = await request(app).get('/api/orders/ord_1').set('x-customer-id', A);
    expect(ok.status).toBe(200);
    expect(ok.body.order_number).toBe('ORD-1001');

    const bad = await request(app).get('/api/orders/ord_4').set('x-customer-id', A);
    expect(bad.status).toBe(403);
  });
  it('covers unknown/cancelled/delivered scenarios', async () => {
    expect((await request(app).get('/api/orders/ord_nope').set('x-customer-id', A)).status).toBe(404);
    const cancelled = await request(app).get('/api/orders/ord_5').set('x-customer-id', A);
    expect(cancelled.body.status).toBe('cancelled');
    const shipped = await request(app).get('/api/orders/ord_2').set('x-customer-id', A);
    expect(shipped.body.tracking_number).toBe('TRK-SHIP-8821');
  });
  it('product unavailable + closed ticket', async () => {
    const p = await request(app).get('/api/products/prod_003');
    expect(p.body.availability_status).toBe('out_of_stock');
    const t = await request(app).get('/api/tickets/tkt_2').set('x-customer-id', A);
    expect(t.body.status).toBe('closed');
    expect((await request(app).get('/api/tickets/tkt_3').set('x-customer-id', A)).status).toBe(403);
  });
});

describe('knowledge + scenarios', () => {
  it('policy question returns citations', async () => {
    const r = await request(app).post('/api/knowledge/search').send({ query: 'refund return policy how many days' });
    expect(r.status).toBe(200);
    expect(r.body[0].title).toMatch(/Return/);
  });
  it('Scenario B: refund policy via chat includes knowledge citation', async () => {
    const c = await request(app).post('/api/conversations').set('x-customer-id', A).send({});
    const turn = await request(app).post(`/api/conversations/${c.body.id}/messages`).set('x-customer-id', A).send({ content: 'What is the refund policy?' });
    expect(turn.body.citations.some((x: any) => x.kind === 'knowledge')).toBe(true);
  });
  it('Scenario D: unauthorized order rejected regardless of model', async () => {
    const c = await request(app).post('/api/conversations').set('x-customer-id', A).send({});
    const turn = await request(app).post(`/api/conversations/${c.body.id}/messages`).set('x-customer-id', A).send({ content: 'Tell me about order ORD-2001 status' });
    // ORD-2001 belongs to B; must not leak its details
    expect(turn.status === 403 || !JSON.stringify(turn.body).includes('ORD-2001') || turn.body.text.includes('could not')).toBe(true);
  });
});

describe('streaming', () => {
  it('streams SSE events to completion', async () => {
    const c = await request(app).post('/api/conversations').set('x-customer-id', A).send({});
    const r = await request(app).post(`/api/conversations/${c.body.id}/stream`).set('x-customer-id', A).set('Accept', 'text/event-stream').send({ content: 'What is the warranty period?' });
    expect(r.status).toBe(200);
    expect(r.text).toContain('event: message_start');
    expect(r.text).toContain('event: text_delta');
    expect(r.text).toContain('event: citations');
    expect(r.text).toContain('event: message_complete');
  }, 15000);
});
