import { useState } from 'react';
import { api } from '../services/api.js';
import type { KnowledgeHit } from '../types.js';

export function KnowledgePage() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<KnowledgeHit[]>([]);
  const go = async () => { if (q.trim()) setHits(await api.searchKnowledge(q).catch(() => [])); };
  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h2>Knowledge Base</h2>
      <p style={{ color: '#6f6a8a' }}>Live RAG search over shipping, returns, warranty, troubleshooting, account, and order-status articles.</p>
      <div className="card"><input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="Search policies... e.g. refund" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e9e6f5' }} /></div>
      {hits.map((h) => <div key={h.id} className="card" style={{ marginTop: 10 }}><b>{h.title} / {h.section}</b><p style={{ fontSize: 13 }}>{h.content}</p><span className="badge">score {h.score.toFixed(2)}</span></div>)}
      {!hits.length && <p style={{ color: '#6f6a8a' }}>No evidence yet — search returns nothing rather than inventing a policy.</p>}
    </div>
  );
}
