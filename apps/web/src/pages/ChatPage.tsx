import { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Ellipsis, Trash2 } from 'lucide-react';
import {
  InfoCard,
  Button,
  Skeleton,
  BodySmRegular20,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@app/ui';
import { useChat } from '../hooks/useChat';
import { MessageList } from '../components/MessageList';
import { MessageInput } from '../components/MessageInput';
import type { SessionWithLabel } from '../hooks/useSessions';

interface ChatPageProps {
  onSessionsChange: () => void;
  sessions?: SessionWithLabel[];
}

export function ChatPage({ onSessionsChange, sessions }: ChatPageProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const { messages, streaming, error, send } = useChat(sessionId ?? null);

  const currentSession = sessions?.find((s) => s.id === sessionId);

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

  const topRightIcon = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button Icon={Ellipsis} variant="outline" className="h-10 w-10" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>
          <Trash2 className="w-4 h-4" />
          <BodySmRegular20>Delete</BodySmRegular20>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <InfoCard
      title={currentSession?.label || 'Chat'}
      subtitle={currentSession?.provider ? `Provider: ${currentSession.provider}` : undefined}
      className="w-full max-h-full h-full"
      titleSize="xl"
      topRightIcon={topRightIcon}
    >
      {messages.length === 0 && !streaming ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <MessageList messages={messages} streaming={streaming} />
      )}

      {error && (
        <BodySmRegular20 className="text-red-500 text-center py-2">{error}</BodySmRegular20>
      )}

      <MessageInput onSend={handleSend} disabled={streaming} />
    </InfoCard>
  );
}
