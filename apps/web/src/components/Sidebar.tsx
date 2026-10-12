import { Link, useLocation } from 'react-router-dom';
import type { Conversation } from '../types.js';

export function Sidebar({ conversations, activeId, onSelect, onNew, search, setSearch }: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  const loc = useLocation();
  const filtered = conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  const today = filtered.slice(0, 8);
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">A</div>
        <div><b>Acme Corp Support</b><span>Enterprise Tier</span></div>
      </div>
      <button className="new-btn" onClick={onNew}>+ New Conversation</button>
      <div className="search"><span>⌕</span><input placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <nav className="nav">
        <Link to="/" className={loc.pathname === '/' ? 'active' : ''}>💬 Chat</Link>
        <Link to="/customers" className={loc.pathname.startsWith('/customers') ? 'active' : ''}>👥 Customers</Link>
        <Link to="/knowledge" className={loc.pathname.startsWith('/knowledge') ? 'active' : ''}>📖 Knowledge Base</Link>
      </nav>
      <div className="conv-group">
        <h5>TODAY</h5>
        {today.map((c) => (
          <button key={c.id} className={`conv-item ${c.id === activeId ? 'selected' : ''}`} onClick={() => onSelect(c.id)}>
            <span><b>{c.title}</b><span>{c.customer_id}</span></span><time>{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
          </button>
        ))}
        {!today.length && <p style={{ fontSize: 12, color: '#6f6a8a' }}>No conversations yet.</p>}
      </div>
      <div className="agent">
        <div className="avatar">SP</div>
        <div><b>Elena Rostova</b><span>Senior Tier 3 Specialist</span></div>
      </div>
    </aside>
  );
}
