import { Sidebar } from './Sidebar';
import type { SessionWithLabel } from '../hooks/useSessions';

interface LayoutProps {
  sessions: SessionWithLabel[];
  sessionsLoading: boolean;
  activeSessionId?: string;
  onSessionsChange: () => void;
  children: React.ReactNode;
}

export function Layout({ sessions, sessionsLoading, activeSessionId, onSessionsChange, children }: LayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#0a0a0a]">
      <Sidebar
        sessions={sessions}
        loading={sessionsLoading}
        activeSessionId={activeSessionId}
        onSessionsChange={onSessionsChange}
      />
      <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
    </div>
  );
}
