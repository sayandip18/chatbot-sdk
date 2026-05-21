import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button, Input } from '@app/ui';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({ onSend, disabled = false, placeholder = 'Enter your query' }: MessageInputProps) {
  const [value, setValue] = useState('');

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
    <div className="sticky bottom-0 bg-white flex flex-row gap-4 w-full justify-between p-0.5">
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full"
        placeholder={placeholder}
        disabled={disabled}
      />
      <Button
        loading={disabled}
        Icon={Send}
        variant="outline"
        className="h-10 w-10 shrink-0"
        onClick={submit}
        disabled={!value.trim() || disabled}
      />
    </div>
  );
}
