import { useQuery } from '@tanstack/react-query';
import type { ISession, IMessage } from '@app/types';
import { getSessions, getMessages } from '../api/client';

export interface SessionWithLabel extends ISession {
  label: string;
}

async function fetchLabeledSessions(): Promise<SessionWithLabel[]> {
  const raw = await getSessions();
  const sorted = [...raw].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return Promise.all(
    sorted.map(async (s) => {
      try {
        const msgs: IMessage[] = await getMessages(s.id);
        const first = msgs.find((m) => m.role === 'user');
        const label = first
          ? first.content.length > 45
            ? first.content.slice(0, 45) + '…'
            : first.content
          : `${s.provider} · ${new Date(s.createdAt).toLocaleDateString()}`;
        return { ...s, label };
      } catch {
        return { ...s, label: `${s.provider} · ${new Date(s.createdAt).toLocaleDateString()}` };
      }
    }),
  );
}

export function useSessions() {
  const { data: sessions = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: fetchLabeledSessions,
  });

  return { sessions, loading, reload: refetch };
}
