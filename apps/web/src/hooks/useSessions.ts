import { useState, useEffect, useCallback } from 'react';
import type { ISession, IMessage } from '@app/types';
import { getSessions, getMessages } from '../api/client';

export interface SessionWithLabel extends ISession {
  label: string;
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionWithLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getSessions();
      const sorted = [...raw].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const labeled = await Promise.all(
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

      setSessions(labeled);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { sessions, loading, reload: load };
}
