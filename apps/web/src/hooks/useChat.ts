import { useState, useEffect, useCallback, useRef } from 'react';
import type { IMessage } from '@app/types';
import { getMessages, streamChat } from '../api/client';

export function useChat(sessionId: string | null) {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const loadHistory = useCallback(async (id: string) => {
    const msgs = await getMessages(id);
    setMessages(msgs);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }
    loadHistory(sessionId);
  }, [sessionId, loadHistory]);

  const send = useCallback(
    async (content: string) => {
      if (!sessionId || streaming) return;
      setError(null);
      abortRef.current = false;

      const userMsg: IMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: 'user',
        content,
        status: 'pending',
        createdAt: new Date(),
      };
      const placeholderMsg: IMessage = {
        id: crypto.randomUUID(),
        sessionId,
        role: 'llm',
        content: '',
        status: 'pending',
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, placeholderMsg]);
      setStreaming(true);

      try {
        for await (const chunk of streamChat(sessionId, content)) {
          if (abortRef.current) break;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + chunk };
            return copy;
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error');
        setMessages((prev) => prev.slice(0, -1));
      } finally {
        setStreaming(false);
      }
    },
    [sessionId, streaming],
  );

  return { messages, streaming, error, send };
}
