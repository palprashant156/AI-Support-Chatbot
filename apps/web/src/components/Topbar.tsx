import { getCustomerId, setCustomerId } from '../services/api.js';

export function Topbar({ title }: { title: string }) {
  return (
    <div className="topbar">
      <div className="logo">💬</div>
      <h1>{title}</h1>
      <div className="spacer" />
      <div className="cust-id" style={{ margin: 0 }}>
        <span style={{ color: '#6f6a8a' }}>Acting as</span>
        <select value={getCustomerId()} onChange={(e) => { setCustomerId(e.target.value); location.reload(); }}>
          <option value="cust_demo_001">cust_demo_001 (Aarav)</option>
          <option value="cust_demo_002">cust_demo_002 (Diya)</option>
          <option value="cust_demo_003">cust_demo_003 (Kabir)</option>
        </select>
      </div>
      <span className="pill"><span className="dot" /> Copilot Active</span>
    </div>
  );
}
