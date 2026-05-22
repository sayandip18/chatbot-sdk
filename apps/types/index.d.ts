export type LLMProvider = 'openai' | 'gemini';
export type MessageRole = 'user' | 'system' | 'llm';

export interface ISession {
  id: string;
  provider: LLMProvider;
  isCancelled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatchSessionDto {
  isCancelled: boolean;
}

export interface IMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  status: 'pending' | 'completed';
  createdAt: Date;
}

export interface CreateSessionDto {
  provider: LLMProvider;
  systemPrompt?: string;
}

export interface PostChatDto {
  sessionId: string;
  message: string;
}

export interface SSEChunkEvent {
  content: string;
}

export interface SSEDoneEvent {
  done: true;
}

export interface SSEErrorEvent {
  error: string;
}

export type SSEEvent = SSEChunkEvent | SSEDoneEvent | SSEErrorEvent;
