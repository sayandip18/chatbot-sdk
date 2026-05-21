export interface StreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface BaseLLM {
  stream(messages: ChatMessage[], options?: StreamOptions): AsyncIterable<string>;
}
