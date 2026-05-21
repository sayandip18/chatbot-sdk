import { useState, useRef, useEffect } from 'react';
import { Button } from '@app/ui';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ onSend, disabled = false, placeholder = 'Message...' }: MessageInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="border-t border-zinc-800 bg-[#0a0a0a] px-4 py-4">
      <div className="mx-auto flex max-w-2xl items-end gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm text-white placeholder-zinc-500 outline-none disabled:opacity-50"
          style={{ minHeight: '24px' }}
        />
        <Button
          variant="primary"
          onClick={submit}
          disabled={!value.trim() || disabled}
          loading={disabled}
          className="shrink-0 px-3 py-1.5 text-xs"
        >
          {disabled ? '' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
