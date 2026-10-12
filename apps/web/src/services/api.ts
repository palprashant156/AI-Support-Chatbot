import type { Conversation, Message, Customer, OrderSummary, Ticket, KnowledgeHit, Citation } from '../types.js';

const BASE = '';
let customerId = localStorage.getItem('sf_customer') || 'cust_demo_001';
export const getCustomerId = () => customerId;
export function setCustomerId(id: string) {
  customerId = id;
  localStorage.setItem('sf_customer', id);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'x-customer-id': customerId, ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body?.error?.message || `Request failed ${res.status}`), { status: res.status, code: body?.error?.code });
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<{ ok: boolean; provider: string }>(`/api/health`),
  listConversations: () => req<Conversation[]>(`/api/conversations`),
  createConversation: (title?: string) => req<Conversation>(`/api/conversations`, { method: 'POST', body: JSON.stringify({ title }) }),
  listMessages: (id: string) => req<Message[]>(`/api/conversations/${id}/messages?limit=100`),
  sendMessage: (id: string, content: string, requestId?: string) =>
    req<{ assistantMessageId: string; text: string; citations: Citation[]; provider: string }>(
      `/api/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ content, requestId }) },
    ),
  getCustomer: (id: string) => req<Customer>(`/api/customers/${id}`),
  listOrders: (cid: string) => req<OrderSummary[]>(`/api/customers/${cid}/orders`),
  listTickets: (cid: string) => req<Ticket[]>(`/api/customers/${cid}/tickets`),
  searchKnowledge: (query: string) => req<KnowledgeHit[]>(`/api/knowledge/search`, { method: 'POST', body: JSON.stringify({ query, topK: 4 }) }),
};

export interface StreamEvents {
  onStart?: (info: { messageId: string; provider: string }) => void;
  onDelta?: (delta: string) => void;
  onCitations?: (sources: Citation[]) => void;
  onComplete?: (info: { messageId: string; provider: string }) => void;
  onError?: (err: { code: string; message: string }) => void;
}

// Native fetch SSE reader — parses `event:` / `data:` frames incrementally.
export async function streamChat(conversationId: string, content: string, ev: StreamEvents, signal: AbortSignal): Promise<void> {
  const res = await fetch(`/api/conversations/${conversationId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-customer-id': customerId },
    body: JSON.stringify({ content }),
    signal,
  });
  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({}));
    ev.onError?.({ code: body?.error?.code || 'REQUEST_FAILED', message: body?.error?.message || `HTTP ${res.status}` });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const dispatch = (rawEvent: string, rawData: string) => {
    try {
      const data = JSON.parse(rawData || '{}');
      if (rawEvent === 'message_start') ev.onStart?.(data);
      else if (rawEvent === 'text_delta') ev.onDelta?.(data.delta || '');
      else if (rawEvent === 'citations') ev.onCitations?.(data.sources || []);
      else if (rawEvent === 'message_complete') ev.onComplete?.(data);
      else if (rawEvent === 'error') ev.onError?.(data);
    } catch { /* ignore malformed frame */ }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const lines = frame.split('\n');
        let event = '';
        let data = '';
        for (const l of lines) {
          if (l.startsWith('event:')) event = l.slice(6).trim();
          else if (l.startsWith('data:')) data += l.slice(5).trim();
        }
        if (event) dispatch(event, data);
      }
    }
  } catch (e: any) {
    if (e?.name !== 'AbortError') ev.onError?.({ code: 'STREAM_FAILED', message: e?.message || 'Stream failed' });
  }
}
