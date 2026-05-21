import { useState } from 'react';
import { Copy, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn, BodySmRegular20 } from '@app/ui';
import type { IMessage } from '@app/types';

interface MessageBubbleProps {
  message: IMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'llm';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div
      className={cn(
        'flex flex-col rounded-lg',
        isUser ? 'px-6 py-4 bg-gray-100 border border-gray-100 self-end' : '',
        isAssistant ? 'bg-white self-start' : '',
      )}
    >
      {message.content ? (
        <BodySmRegular20 className="whitespace-pre-wrap break-all block w-full overflow-hidden">
          {message.content}
        </BodySmRegular20>
      ) : isStreaming ? (
        <div className="flex flex-row items-center gap-2 text-gray-800">
          <div className="flex gap-2 mt-0.5">
            <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:200ms]" />
            <span className="w-2 h-2 bg-emerald-600 rounded-full animate-bounce [animation-delay:400ms]" />
          </div>
        </div>
      ) : null}

      {isAssistant && message.content && (
        <div className="flex flex-row gap-6 text-foreground p-3">
          <Copy className="h-4 w-4 cursor-pointer hover:text-emerald-600 transition-colors" onClick={handleCopy} />
          <ThumbsUp
            className={cn('h-4 w-4 cursor-pointer transition-colors', liked ? 'text-green-600' : 'hover:text-green-600')}
            onClick={() => { setLiked(!liked); setDisliked(false); }}
          />
          <ThumbsDown
            className={cn('h-4 w-4 cursor-pointer transition-colors', disliked ? 'text-orange-500' : 'hover:text-orange-500')}
            onClick={() => { setDisliked(!disliked); setLiked(false); }}
          />
        </div>
      )}
    </div>
  );
}
