import { useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Ellipsis, Ban, RotateCcw } from 'lucide-react';
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
import { patchSession } from '../api/client';

interface ChatPageProps {
  onSessionsChange: () => void;
  sessions?: SessionWithLabel[];
}

export function ChatPage({ onSessionsChange, sessions }: ChatPageProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const { messages, streaming, error, send } = useChat(sessionId ?? null);

  const currentSession = sessions?.find((s) => s.id === sessionId);
  const isCancelled = currentSession?.isCancelled ?? false;

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

  const handleToggleCancel = useCallback(async () => {
    if (!sessionId) return;
    await patchSession(sessionId, { isCancelled: !isCancelled });
    onSessionsChange();
  }, [sessionId, isCancelled, onSessionsChange]);

  const topRightIcon = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button Icon={Ellipsis} variant="outline" className="h-10 w-10" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleToggleCancel}>
          {isCancelled ? (
            <>
              <RotateCcw className="w-4 h-4" />
              <BodySmRegular20>Resume</BodySmRegular20>
            </>
          ) : (
            <>
              <Ban className="w-4 h-4" />
              <BodySmRegular20>Cancel</BodySmRegular20>
            </>
          )}
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

      <MessageInput
        onSend={handleSend}
        disabled={streaming || isCancelled}
        placeholder={isCancelled ? 'Conversation cancelled' : 'Enter your query'}
      />
    </InfoCard>
  );
}
