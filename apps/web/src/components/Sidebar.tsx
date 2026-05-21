import { useNavigate } from 'react-router-dom';
import { Button, Spinner } from '@app/ui';
import type { SessionWithLabel } from '../hooks/useSessions';

interface SidebarProps {
  sessions: SessionWithLabel[];
  loading: boolean;
  activeSessionId?: string;
  onSessionsChange: () => void;
}

export function Sidebar({ sessions, loading, activeSessionId }: SidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="flex w-[25%] min-w-[220px] max-w-[300px] flex-col border-r border-zinc-800 bg-[#111111]">
      <div className="p-3 border-b border-zinc-800">
        <Button
          variant="primary"
          className="w-full"
          onClick={() => navigate('/')}
        >
          + New Chat
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex justify-center pt-8">
            <Spinner size="sm" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-4 pt-6 text-center text-xs text-zinc-600">No conversations yet</p>
        ) : (
          sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/chat/${s.id}`)}
              className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-zinc-800 ${
                s.id === activeSessionId
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <p className="truncate leading-snug">{s.label}</p>
              <p className="mt-0.5 text-[11px] text-zinc-600 capitalize">{s.provider}</p>
            </button>
          ))
        )}
      </nav>
    </aside>
  );
}
