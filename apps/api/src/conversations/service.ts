import { memory, newId } from '../database/memory.js';
import { getPool } from '../database/db.js';
import type { Conversation, Message } from '../types.js';
import { forbidden } from '../errors/AppError.js';

const usePg = () => {
  const p = getPool();
  return p && process.env.NODE_ENV !== 'test' ? p : null;
};

function titleFrom(text: string): string {
  const t = text.trim().slice(0, 60);
  return t || 'New conversation';
}

export async function createConversation(customerId: string, title?: string): Promise<Conversation> {
  const conv: Conversation = {
    id: newId('conv'),
    customer_id: customerId,
    title: title ?? 'New conversation',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const pool = usePg();
  if (pool) {
    try {
      const r = await pool.query(
        'INSERT INTO conversations(id,customer_id,title) VALUES($1,$2,$3) RETURNING *',
        [conv.id, conv.customer_id, conv.title],
      );
      return r.rows[0] as Conversation;
    } catch { /* fallback */ }
  }
  memory.conversations.set(conv.id, conv);
  return conv;
}

export async function listConversations(customerId: string): Promise<Conversation[]> {
  const pool = usePg();
  if (pool) {
    try {
      const r = await pool.query('SELECT * FROM conversations WHERE customer_id=$1 ORDER BY updated_at DESC LIMIT 50', [customerId]);
      return r.rows as Conversation[];
    } catch { /* fallback */ }
  }
  return [...memory.conversations.values()]
    .filter((c) => c.customer_id === customerId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 50);
}

export async function getConversation(id: string, requesterId: string): Promise<Conversation | null> {
  const pool = usePg();
  let c: Conversation | undefined;
  if (pool) {
    try {
      const r = await pool.query('SELECT * FROM conversations WHERE id=$1', [id]);
      c = r.rows[0];
    } catch { /* fallback */ }
  }
  c = c ?? memory.conversations.get(id);
  if (!c) return null;
  if (c.customer_id !== requesterId) throw forbidden('Conversation belongs to another customer');
  return c;
}

export async function appendMessage(opts: {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  status?: Message['status'];
  requestId?: string | null;
  citations?: Message['citations'];
  requesterId: string;
}): Promise<Message> {
  await getConversation(opts.conversationId, opts.requesterId); // ownership check

  // Idempotency: same requestId returns existing message (prevents duplicates on retry)
  if (opts.requestId) {
    const existing = [...memory.messages.values()].find((m) => m.request_id === opts.requestId);
    if (existing) return existing;
    const pool = usePg();
    if (pool) {
      try {
        const r = await pool.query('SELECT * FROM messages WHERE request_id=$1', [opts.requestId]);
        if (r.rows[0]) return r.rows[0] as Message;
      } catch { /* ignore */ }
    }
  }

  const msg: Message = {
    id: newId('msg'),
    conversation_id: opts.conversationId,
    role: opts.role,
    content: opts.content,
    status: opts.status ?? 'completed',
    request_id: opts.requestId ?? null,
    citations: opts.citations ?? [],
    created_at: new Date().toISOString(),
    completed_at: (opts.status ?? 'completed') === 'completed' ? new Date().toISOString() : null,
  };
  const pool = usePg();
  if (pool) {
    try {
      const r = await pool.query(
        `INSERT INTO messages(id,conversation_id,role,content,status,request_id,citations,completed_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [msg.id, msg.conversation_id, msg.role, msg.content, msg.status, msg.request_id, JSON.stringify(msg.citations), msg.completed_at],
      );
      const row = r.rows[0] as any;
      if (typeof row.citations === 'string') row.citations = JSON.parse(row.citations);
      await pool.query('UPDATE conversations SET updated_at=now() WHERE id=$1', [opts.conversationId]);
      // Auto-title from first user message
      if (opts.role === 'user') {
        await pool.query(`UPDATE conversations SET title=$2 WHERE id=$1 AND title='New conversation'`, [opts.conversationId, titleFrom(opts.content)]);
      }
      return row as Message;
    } catch { /* fallback */ }
  }
  memory.messages.set(msg.id, msg);
  const conv = memory.conversations.get(opts.conversationId);
  if (conv) {
    conv.updated_at = new Date().toISOString();
    if (opts.role === 'user' && conv.title === 'New conversation') conv.title = titleFrom(opts.content);
  }
  return msg;
}

export async function listMessages(conversationId: string, requesterId: string, limit = 50, before?: string): Promise<Message[]> {
  await getConversation(conversationId, requesterId);
  const pool = usePg();
  if (pool) {
    try {
      const r = before
        ? await pool.query(
            'SELECT * FROM messages WHERE conversation_id=$1 AND created_at < $3 ORDER BY created_at ASC LIMIT $2',
            [conversationId, limit, before],
          )
        : await pool.query('SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC LIMIT $2', [conversationId, limit]);
      return (r.rows as any[]).map((m) => ({
        ...m,
        citations: typeof m.citations === 'string' ? JSON.parse(m.citations) : (m.citations ?? []),
      })) as Message[];
    } catch { /* fallback */ }
  }
  return [...memory.messages.values()]
    .filter((m) => m.conversation_id === conversationId && (!before || m.created_at < before))
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(0, limit);
}
