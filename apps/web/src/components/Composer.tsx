import { useState } from 'react';

export function Composer({ onSend, disabled, onStop, streaming }: {
  onSend: (text: string) => void;
  disabled?: boolean;
  onStop?: () => void;
  streaming?: boolean;
}) {
  const [v, setV] = useState('');
  const send = () => {
    const t = v.trim();
    if (!t || disabled) return;
    onSend(t);
    setV('');
  };
  return (
    <div>
      <div className="composer">
        <textarea
          placeholder="Ask a question about an order, customer account, or support policy..."
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          disabled={disabled}
        />
        <div className="composer-row">
          <span style={{ fontSize: 12, color: '#6f6a8a' }}>Press Enter to send</span>
          {streaming && <button className="stop-btn" onClick={onStop}>■ Stop generating</button>}
          <button className="send-btn" onClick={send} disabled={disabled || !v.trim()} aria-label="Send">↑</button>
        </div>
      </div>
      <p className="fineprint">Responses synthesize customer records and knowledge-base sources. Verify important details before finalizing tickets.</p>
    </div>
  );
}
