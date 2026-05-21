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
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        {visible.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            isStreaming={streaming && i === visible.length - 1 && m.role === 'llm'}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
