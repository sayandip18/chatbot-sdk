import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { useSessions } from './hooks/useSessions';
import { Layout } from './components/Layout';
import { NewChatPage } from './pages/NewChatPage';
import { ChatPage } from './pages/ChatPage';

function AppShell() {
  const { sessions, loading, reload } = useSessions();
  const params = useParams<{ sessionId?: string }>();

  return (
    <Layout
      sessions={sessions}
      sessionsLoading={loading}
      activeSessionId={params.sessionId}
      onSessionsChange={reload}
    >
      <Routes>
        <Route path="/" element={<NewChatPage onSessionCreated={reload} />} />
        <Route path="/chat/:sessionId" element={<ChatPage onSessionsChange={reload} sessions={sessions} />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}
