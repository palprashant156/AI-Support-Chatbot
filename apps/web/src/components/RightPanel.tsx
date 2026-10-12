import { useEffect, useState } from 'react';
import { api, getCustomerId } from '../services/api.js';
import type { OrderSummary, Ticket, KnowledgeHit, Customer } from '../types.js';

// Right rail: Quick Lookup (empty state) or Context Inspector (live customer data).
// Clearly separates knowledge citations from live business API data.
export function RightPanel({ active, inspected }: { active: boolean; inspected: KnowledgeHit | null }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<KnowledgeHit[]>([]);
  const [loading, setLoading] = useState(false);
  const cid = getCustomerId();

  useEffect(() => {
    let dead = false;
    (async () => {
      setLoading(true);
      try {
        const [c, o, t] = await Promise.all([api.getCustomer(cid), api.listOrders(cid), api.listTickets(cid)]);
        if (!dead) { setCustomer(c); setOrders(o); setTickets(t); }
      } catch { /* show empty states, not fake data */ }
      finally { if (!dead) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [cid, active]);

  const lookup = async () => {
    if (!q.trim()) return;
    setHits(await api.searchKnowledge(q).catch(() => []));
  };

  if (!active && !inspected && orders.length === 0 && !loading) {
    return (
      <div className="right">
        <div className="card lookup">
          <h4>Quick Lookup</h4>
          <input placeholder="Search customer, email, or order #..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && lookup()} />
          <div className="recent-q"><span style={{ fontSize: 12, color: '#6f6a8a' }}>Try:</span><button onClick={() => { setQ('refund policy'); setTimeout(lookup, 0); }}>refund policy</button><button onClick={() => { setQ('ORD-1001'); setTimeout(lookup, 0); }}>ORD-1001</button></div>
          {!!hits.length && hits.map((h) => <div key={h.id} className="src-row"><b>{h.title}</b><div style={{ color: '#6f6a8a' }}>{h.section}</div><div>{h.content.slice(0, 140)}…</div></div>)}
        </div>
        <div className="card"><div className="empty-ctx"><div className="big">≣</div><b style={{ color: '#17142b' }}>No Active Context</b><p>Customer information, recent orders, and cited knowledge sources will automatically populate once a customer or conversation topic is detected.</p></div>
          <div className="mini-stats"><div><span>Indexed KB Articles</span><span>8</span></div><div><span>Customer Graph Sync</span><span>● Live</span></div><div><span>Avg Retrieval Latency</span><span>~12ms</span></div></div>
        </div>
        <div className="tip"><b>💡 Pro-tip for Support Leads</b><br />Type /lookup followed by any order reference or ticket ID to bind live telemetry data instantly.</div>
      </div>
    );
  }

  const open = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  return (
    <div className="right">
      <div className="card">
        <h3>Context Inspector <span className="badge live">Live</span></h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="avatar">EV</div>
          <div><b>{customer?.name || cid}</b><div style={{ fontSize: 12, color: '#6f6a8a' }}>{cid}@demo</div></div>
        </div>
        {loading ? <p style={{ fontSize: 12, color: '#6f6a8a' }}>Loading live records…</p> : (
          <>
            <h4 style={{ marginTop: 12 }}>Recent Orders · {orders.length} records</h4>
            {!orders.length && <p style={{ fontSize: 12 }}>No orders — distinct from loading failure.</p>}
            {orders.slice(0, 4).map((o) => (
              <div key={o.id} className="order-row"><b>{o.order_number}</b><span className={`status ${o.status[0].toUpperCase() + o.status.slice(1)}`}>{o.status}</span><div>Tracking: {o.tracking_number || 'none yet'} · ETA: {o.estimated_delivery_at ? new Date(o.estimated_delivery_at).toLocaleDateString() : 'n/a'}</div></div>
            ))}
            <h4 style={{ marginTop: 12 }}>Open Support Tickets · {open.length}</h4>
            {!open.length && <p style={{ fontSize: 12 }}>No open tickets.</p>}
            {open.slice(0, 3).map((t) => <div key={t.id} className="ticket-row"><b>#{t.id}</b> · {t.status}<div>{t.subject}</div></div>)}
          </>
        )}
      </div>
      <div className="card">
        <h3>📖 Retrieved Sources {inspected ? '· 1 inspected' : ''}</h3>
        {inspected ? (
          <div className="src-row"><b>{inspected.title}</b><div style={{ color: '#4338ca', fontSize: 12 }}>{inspected.section} · score {inspected.score.toFixed(2)}</div><div className="src-quote">“{inspected.content}”</div><div style={{ fontSize: 11, color: '#6f6a8a', marginTop: 6 }}>Knowledge-base citation — general guidance, not a live record.</div></div>
        ) : <p style={{ fontSize: 12, color: '#6f6a8a' }}>Click a knowledge chip under an answer to inspect the source. Live order data is labelled separately.</p>}
      </div>
    </div>
  );
}
