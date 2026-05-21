import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LLMProvider } from '@app/types';
import { InfoCard, Select } from '@app/ui';
import { createSession } from '../api/client';
import { MessageInput } from '../components/MessageInput';

interface NewChatPageProps {
  onSessionCreated: () => void;
}

export function NewChatPage({ onSessionCreated }: NewChatPageProps) {
  const navigate = useNavigate();
  const [provider, setProvider] = useState<LLMProvider>('openai');
  const [sending, setSending] = useState(false);

  const handleSend = async (message: string) => {
    setSending(true);
    try {
      const session = await createSession(provider);
      onSessionCreated();
      navigate(`/chat/${session.id}`, { state: { firstMessage: message } });
    } catch {
      setSending(false);
    }
  };

  return (
    <InfoCard
      title="New Conversation"
      subtitle="Select a provider and start chatting"
      className="w-full max-h-full h-full"
      titleSize="xl"
    >
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <Select
            id="provider"
            label="Provider"
            value={provider}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProvider(e.target.value as LLMProvider)}
            options={[
              { value: 'openai', label: 'OpenAI (GPT-4o mini)' },
              { value: 'gemini', label: 'Gemini 1.5 Flash' },
            ]}
            className="w-52"
          />
        </div>
      </div>

      <MessageInput
        onSend={handleSend}
        disabled={sending}
        placeholder="Start typing to begin..."
      />
    </InfoCard>
  );
}
