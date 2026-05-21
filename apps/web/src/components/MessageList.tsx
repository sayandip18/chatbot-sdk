import { useEffect, useRef } from 'react';
import type { IMessage } from '@app/types';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: IMessage[];
  streaming: boolean;
}

export function MessageList({ messages, streaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const visible = messages.filter((m) => m.role !== 'system');

  return (
    <div className="flex-1 flex flex-col gap-4 w-full overflow-y-auto mb-2 px-1 h-full">
      {visible.map((m, i) => (
        <MessageBubble
          key={m.id}
          message={m}
          isStreaming={streaming && i === visible.length - 1 && m.role === 'llm'}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
