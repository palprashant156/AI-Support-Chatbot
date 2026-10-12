import { useCallback, useEffect, useRef, useState } from 'react';
import { api, streamChat } from '../services/api.js';
import type { Conversation, Message, KnowledgeHit, Citation } from '../types.js';
import { Sidebar } from '../components/Sidebar.js';
import { Topbar } from '../components/Topbar.js';
import { Composer } from '../components/Composer.js';
import { MessageItem } from '../components/MessageItem.js';
import { RightPanel } from '../components/RightPanel.js';

type StreamState = 'idle' | 'loading-history' | 'streaming' | 'failed' | 'interrupted';

export function ChatPage({ conversations, refresh, activeId, setActiveId }: {
  conversations: Conversation[];
  refresh: () => Promise<void>;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<StreamState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [inspected, setInspected] = useState<KnowledgeHit | null>(null);
  const [search, setSearch] = useState('');
  const [streamText, setStreamText] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const active = conversations.find((c) => c.id === activeId) || null;

  const load = useCallback(async (id: string) => {
    setState('loading-history');
    setError(null);
    try {
      setMessages(await api.listMessages(id));
      setState('idle');
    } catch (e: any) {
      setError(e?.message || 'Could not load history (network error).');
      setState('failed');
    }
  }, []);

  useEffect(() => { if (activeId) load(activeId); else { setMessages([]); setStreamText(''); setCitations([]); } }, [activeId, load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, streamText]);

  const newConversation = async () => {
    const c = await api.createConversation().catch(() => null);
    if (c) { await refresh(); setActiveId(c.id); }
  };

  const send = async (text: string) => {
    let id = activeId;
    if (!id) {
      const c = await api.createConversation(text.slice(0, 60)).catch(() => null);
      if (!c) { setError('Network error creating conversation.'); setState('failed'); return; }
      await refresh();
      setActiveId(c.id);
      id = c.id;
    }
    const userMsg: Message = { id: `local-${Date.now()}`, conversation_id: id, role: 'user', content: text, status: 'completed', request_id: null, citations: [], created_at: new Date().toISOString(), completed_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setStreamText('');
    setCitations([]);
    setState('streaming');
    setError(null);
    const abort = new AbortController();
    abortRef.current = abort;
    let acc = '';
    await streamChat(id, text, {
      onDelta: (d) => { acc += d; setStreamText(acc); },
      onCitations: (s) => setCitations(s),
      onComplete: async () => { setState('idle'); setStreamText(''); await load(id!); await refresh(); },
      onError: async (e) => {
        if (abort.signal.aborted) { setState('interrupted'); }
        else { setState('failed'); setError(e.message); }
        setStreamText(acc);
        await load(id!).catch(() => {});
        await refresh().catch(() => {});
      },
    }, abort.signal);
  };

  const stop = () => abortRef.current?.abort();
  const retry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) send(lastUser.content);
  };

  const inspect = async (chunkId: string) => {
    const hits = await api.searchKnowledge(chunkId.replace(/kb-.*/, '') || 'policy').catch(() => []);
    setInspected(hits.find((h) => h.id === chunkId) || hits[0] || null);
  };

  const empty = !activeId || (messages.length === 0 && !streamText);

  return (
    <div className="app">
      <Sidebar conversations={conversations} activeId={activeId} onSelect={setActiveId} onNew={newConversation} search={search} setSearch={setSearch} />
      <div className="main">
        <Topbar title="SupportFlow AI" />
        <div className="content">
          <div className="center">
            {empty ? (
              <>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <h2 style={{ margin: 0 }}>New Support Conversation</h2>
                  <span className="pill"><span className="dot" /> AI Provider: Active (RAG retrieval standby)</span>
                </div>
                <div className="hero">
                  <div className="hero-icon">💬</div>
                  <h2>How can we help today?</h2>
                  <p>Query live customer records, retrieve verified knowledge base policies, or investigate active order statuses.</p>
                  <div className="suggest">
                    {[['Where is order ORD-1001?', 'Inspects shipping status & warehouse manifest'], ['What is our return policy for...', 'RAG search across customer master agreements'], ['Warranty duration on ErgoKey series?', 'Hardware specifications & replacement coverage'], ['Escalate ticket to tier 2 support?', 'Routing guidelines & agent handover workflows']].map(([t, d]) => (
                      <div key={t} className="s-card" onClick={() => send(t)}><b>{t} <span>→</span></b><p>{d}</p></div>
                    ))}
                  </div>
                </div>
                <Composer onSend={send} streaming={false} />
              </>
            ) : (
              <>
                <div className="thread-head">
                  <h2>{active?.title || 'Order Inquiry'} <span className="badge">In Progress</span></h2>
                  <p>{active?.customer_id} · <span className="pill">✨ Mock LLM ● RAG active</span></p>
                </div>
                {state === 'loading-history' && <p style={{ color: '#6f6a8a' }}>Loading history…</p>}
                {error && state === 'failed' && !streamText && <div className="error-box">{error} <button className="retry" onClick={retry}>Retry failed response</button></div>}
                {messages.map((m) => <MessageItem key={m.id} m={m} onRetry={retry} onInspect={inspect} />)}
                {state === 'streaming' && (
                  <div className="msg">
                    <div className="who" style={{ background: '#4338ca', color: '#fff' }}>SF</div>
                    <div className="bubble" style={{ flex: 1 }}><span style={{ fontSize: 11, color: '#4338ca' }}>● Streaming response</span><div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{streamText}<span className="stream-caret" /></div>
                      {!!citations.length && <div className="cite-row"><span>Sources · {citations.length}</span>{citations.map((c, i) => <span key={i} className={`chip ${c.kind === 'business' ? 'business' : ''}`}>{c.title}</span>)}</div>}
                      <div style={{ marginTop: 8 }}><button className="stop-btn" onClick={stop}>■ Stop generating</button></div>
                    </div>
                  </div>
                )}
                {state === 'interrupted' && streamText && <div className="error-box">Interrupted — partial response kept. <button className="retry" onClick={retry}>Retry</button></div>}
                <Composer onSend={send} disabled={state === 'streaming' || state === 'loading-history'} streaming={state === 'streaming'} onStop={stop} />
                <div ref={bottomRef} />
              </>
            )}
          </div>
          <RightPanel active={!!activeId && !empty} inspected={inspected} />
        </div>
      </div>
    </div>
  );
}
