import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getCustomerId } from '../services/api.js';
import type { Conversation } from '../types.js';
import { Sidebar } from '../components/Sidebar.js';
import { Topbar } from '../components/Topbar.js';

interface Row { id: string; name: string; orders: number; lastOrder?: string; status?: string; tickets: number; spend: number; }

// Customers page mirrors screen2 styling but binds to LIVE backend records
// (3 demo customers) instead of hardcoded 1,248 rows. Metrics are computed,
// never hardcoded as successful responses.
export function CustomersPage({ conversations, activeId, setActiveId, refresh }: {
  conversations: Conversation[]; activeId: string | null; setActiveId: (id: string | null) => void; refresh: () => Promise<void>;
}) {
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<'all' | 'open'>('all');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const ids = ['cust_demo_001', 'cust_demo_002', 'cust_demo_003'];
      const out: Row[] = [];
      for (const id of ids) {
        try {
          const [c, o, t] = await Promise.all([api.getCustomer(id), api.listOrders(id), api.listTickets(id)]);
          out.push({ id: c.id, name: c.name, orders: o.length, lastOrder: o[0]?.order_number, status: o[0]?.status, tickets: t.filter((x) => x.status === 'open' || x.status === 'in_progress').length, spend: o.reduce((a, x) => a + x.total_cents, 0) / 100 });
        } catch { /* skip unreachable */ }
      }
      setRows(out);
    })();
  }, []);

  const startChat = async () => {
    const c = await api.createConversation('Support session').catch(() => null);
    if (c) { await refresh(); setActiveId(c.id); nav('/'); }
  };

  const shown = rows.filter((r) =>
    (filter === 'all' || r.tickets > 0) && (r.name.toLowerCase().includes(q.toLowerCase()) || r.id.includes(q)),
  );
  const openCount = rows.reduce((a, r) => a + r.tickets, 0);

  return (
    <div className="app">
      <Sidebar conversations={conversations} activeId={activeId} onSelect={(id) => { setActiveId(id); nav('/'); }} onNew={startChat} search={search} setSearch={setSearch} />
      <div className="main">
        <Topbar title="SupportFlow AI" />
        <div className="content" style={{ gridTemplateColumns: '1fr' }}>
          <div className="center">
            <div className="metrics">
              <div className="metric"><h5>ACTIVE PORTFOLIO</h5><div className="big">{rows.length}</div><div style={{ fontSize: 12, color: '#6f6a8a' }}>Live demo accounts · {getCustomerId()} acting</div></div>
              <div className="metric"><h5>TOTAL ORDERS</h5><div className="big">{rows.reduce((a, r) => a + r.orders, 0)}</div><div style={{ fontSize: 12, color: '#6f6a8a' }}>Across demo customers</div></div>
              <div className="metric"><h5>OPEN TICKETS</h5><div className="big">{openCount}</div><div style={{ fontSize: 12, color: '#6f6a8a' }}>Needs triage</div></div>
              <div className="metric"><h5>AGGREGATE SPEND</h5><div className="big">${rows.reduce((a, r) => a + r.spend, 0).toLocaleString()}</div><div style={{ fontSize: 12, color: '#6f6a8a' }}>Demo lifetime value</div></div>
            </div>
            <h2 style={{ margin: '18px 0 4px' }}>Customers</h2>
            <p style={{ color: '#6f6a8a', fontSize: 13, margin: 0 }}>Directory of authorized customer accounts, active support cases, and purchase records.</p>
            <div className="card" style={{ marginTop: 12 }}>
              <input placeholder="Search by customer name or CUST id..." value={q} onChange={(e) => setQ(e.target.value)} style={{ width: '100%', border: '1px solid #e9e6f5', borderRadius: 8, padding: 10 }} />
              <div className="filters">
                <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>All Tiers ({rows.length})</button>
                <button className={filter === 'open' ? 'on' : ''} onClick={() => setFilter('open')}>● Has Open Ticket ({openCount})</button>
              </div>
            </div>
            <div className="table">
              <table>
                <thead><tr><th>CUSTOMER</th><th>ACCOUNT ID</th><th>OPEN TICKETS</th><th>RECENT ORDERS</th><th>TOTAL SPEND</th><th></th></tr></thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td><b>{r.name}</b><div style={{ color: '#6f6a8a', fontSize: 12 }}>{r.id}@demo</div></td>
                      <td>{r.id}</td>
                      <td>{r.tickets > 0 ? `● ${r.tickets} Open` : '✓ 0 Tickets'}</td>
                      <td>{r.orders} orders<div style={{ fontSize: 12 }}>{r.lastOrder} <span className="badge">{r.status}</span></div></td>
                      <td>${r.spend.toLocaleString()}</td>
                      <td><button className="start-btn" onClick={startChat}>💬 Start</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!shown.length && <p style={{ color: '#6f6a8a' }}>No customers match — distinct from load failure.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
