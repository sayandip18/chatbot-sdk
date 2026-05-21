export interface StreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AdapterMeta {
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface StreamResult {
  stream: AsyncIterable<string>;
  meta: Promise<AdapterMeta>;
}

export interface BaseLLM {
  stream(messages: ChatMessage[], options?: StreamOptions): StreamResult;
}
