import type { Message } from '../types.js';

// Minimal markdown: **bold**, `code`, line breaks. No extra deps; output-escaped via React nodes (no dangerouslySetInnerHTML).
export function renderMiniMarkdown(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} style={{ background: '#f1eefc', padding: '1px 5px', borderRadius: 5 }}>{p.slice(1, -1)}</code>;
    return <span key={i}>{p}</span>;
  });
}
function orderNumberFrom(m: Message): string | null {
  const m1 = m.content.match(/ORD-\d+/);
  if (m1) return m1[0];
  const c = m.citations.find((x) => x.kind === 'business' && x.title.startsWith('Order'));
  return c ? c.title.replace('Order ', '') : null;
}

export function MessageItem({ m, onRetry, onInspect }: {
  m: Message;
  onRetry?: () => void;
  onInspect?: (chunkId: string) => void;
}) {
  if (m.role === 'user') {
    return (
      <div className="msg">
        <div className="who">EV</div>
        <div><div style={{ fontSize: 12, color: '#6f6a8a', marginBottom: 6 }}>You · {new Date(m.created_at).toLocaleTimeString()}</div>
          <div className="bubble user">{m.content}</div></div>
      </div>
    );
  }
  const ord = orderNumberFrom(m);
  const failed = m.status === 'failed' || m.status === 'interrupted';
  const knowledge = m.citations.filter((c) => c.kind === 'knowledge');
  const business = m.citations.filter((c) => c.kind === 'business');
  return (
    <div className="msg">
      <div className="who" style={{ background: '#4338ca', color: '#fff' }}>SF</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, color: '#6f6a8a', marginBottom: 6 }}>SupportFlow AI · {m.status}{m.status === 'interrupted' ? ' (stopped)' : ''}</div>
        <div className="bubble">
          {ord && m.content.includes(`ORDER ${ord}`) && (
            <div className="order-card">
              <div className="order-card-head"><b>Order {ord}</b><span className="badge amber">{m.content.match(/status=([a-z]+)/)?.[1] || 'verified'}</span><span className="verified">✓ Verified Store API Record</span></div>
            </div>
          )}
          <div style={{ whiteSpace: 'pre-wrap' }}>{renderMiniMarkdown(m.content)}</div>
          {(knowledge.length > 0 || business.length > 0) && (
            <div className="cite-row">
              <span>Sources · {m.citations.length}</span>
              {business.map((c, i) => <button key={`b${i}`} className="chip business" title={c.ref_id}>{c.title} · live</button>)}
              {knowledge.map((c, i) => <button key={`k${i}`} className="chip" onClick={() => c.chunk_id && onInspect?.(c.chunk_id)} title={c.section}>{c.title}{c.section ? ` / ${c.section}` : ''}</button>)}
            </div>
          )}
          {failed && (
            <div className="error-box">
              {m.status === 'interrupted' ? 'Response stopped. Partial text saved.' : 'Response failed partway. Partial text saved.'}{' '}
              {onRetry && <button className="retry" onClick={onRetry}>Retry</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
