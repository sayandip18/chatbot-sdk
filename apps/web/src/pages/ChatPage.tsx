import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useChat } from '../hooks/useChat';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';

interface ChatPageProps {
  onSessionsChange: () => void;
}

export function ChatPage({ onSessionsChange }: ChatPageProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const { messages, streaming, error, send } = useChat(sessionId ?? null);

  useEffect(() => {
    const firstMessage = location.state?.firstMessage as string | undefined;
    if (firstMessage && sessionId && messages.length === 0) {
      send(firstMessage).then(() => onSessionsChange());
      window.history.replaceState({}, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const handleSend = async (message: string) => {
    await send(message);
    onSessionsChange();
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {messages.length === 0 && !streaming ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-zinc-600 text-sm">Loading conversation…</p>
        </div>
      ) : (
        <MessageList messages={messages} streaming={streaming} />
      )}

      {error && (
        <p className="px-4 py-2 text-center text-xs text-red-400">{error}</p>
      )}

      <MessageInput onSend={handleSend} disabled={streaming} />
    </div>
  );
}
