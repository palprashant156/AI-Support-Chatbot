import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { api } from './services/api.js';
import type { Conversation } from './types.js';
import { ChatPage } from './pages/ChatPage.js';
import { CustomersPage } from './pages/CustomersPage.js';
import { KnowledgePage } from './pages/KnowledgePage.js';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setConversations(await api.listConversations()); } catch { /* network error state handled per-page */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage conversations={conversations} refresh={refresh} activeId={activeId} setActiveId={setActiveId} />} />
        <Route path="/customers" element={<CustomersPage conversations={conversations} activeId={activeId} setActiveId={setActiveId} refresh={refresh} />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
      </Routes>
    </BrowserRouter>
  );
}
