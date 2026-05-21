import type { IMessage } from '@app/types';

interface MessageBubbleProps {
  message: IMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-white text-black'
            : 'bg-zinc-800 text-zinc-100'
        }`}
      >
        {message.content || (isStreaming ? <span className="inline-block h-4 w-1 animate-pulse bg-zinc-400" /> : null)}
      </div>
    </div>
  );
}
