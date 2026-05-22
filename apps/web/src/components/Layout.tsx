import { useNavigate } from 'react-router-dom';
import {
  MainPage,
  HubSection,
  Button,
  Spinner,
  cn,
  BodySmMedium20,
  LabelXsMedium16,
  BodySmRegular20,
} from '@app/ui';
import { MessageSquare, Plus, LayoutDashboard } from 'lucide-react';
import type { SessionWithLabel } from '../hooks/useSessions';

interface LayoutProps {
  sessions: SessionWithLabel[];
  sessionsLoading: boolean;
  activeSessionId?: string;
  onSessionsChange: () => void;
  children: React.ReactNode;
}

export function Layout({ sessions, sessionsLoading, activeSessionId, children }: LayoutProps) {
  const navigate = useNavigate();

  return (
    <MainPage
      title="AI Chat"
      actionComponent={
        <div className="flex gap-2">
          <Button Icon={LayoutDashboard} variant="outline" onClick={() => navigate('/dashboard')}>Dashboard</Button>
          <Button Icon={Plus} onClick={() => navigate('/')}>New Chat</Button>
        </div>
      }
    >
      <div className="h-full flex flex-row gap-8">
        <HubSection title="Conversations" Icon={MessageSquare}>
          <div className="flex flex-col gap-2 p-6">
            {sessionsLoading ? (
              <div className="flex justify-center pt-4">
                <Spinner size="sm" />
              </div>
            ) : sessions.length === 0 ? (
              <BodySmRegular20 className="text-center text-gray-400 pt-4">
                No conversations yet
              </BodySmRegular20>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate(`/chat/${s.id}`)}
                  className={cn(
                    'px-4 py-2 rounded-md cursor-pointer hover:bg-slate-100',
                    s.id === activeSessionId ? 'bg-slate-200' : 'bg-white'
                  )}
                >
                  <BodySmMedium20 className="block truncate">{s.label || 'Untitled'}</BodySmMedium20>
                  <LabelXsMedium16 className="text-gray-500 capitalize block">{s.provider}</LabelXsMedium16>
                </div>
              ))
            )}
          </div>
        </HubSection>

        <div className="flex-1 h-full overflow-hidden">
          {children}
        </div>
      </div>
    </MainPage>
  );
}
