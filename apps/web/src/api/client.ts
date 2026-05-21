import type { ISession, IMessage, LLMProvider, SSEChunkEvent, SSEDoneEvent, SSEErrorEvent } from '@app/types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export function getSessions(): Promise<ISession[]> {
  return request('/sessions');
}

export function createSession(provider: LLMProvider): Promise<ISession> {
  return request('/sessions', { method: 'POST', body: JSON.stringify({ provider }) });
}

export function getMessages(sessionId: string): Promise<IMessage[]> {
  return request(`/chat/${sessionId}`);
}

export async function* streamChat(sessionId: string, message: string): AsyncGenerator<string> {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, message }),
  });

  if (!res.ok) throw new Error(`Stream failed: ${res.status}`);
  if (!res.body) throw new Error('No response body');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const dataLine = event.split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) continue;
      const data = JSON.parse(dataLine.slice(6)) as SSEChunkEvent | SSEDoneEvent | SSEErrorEvent;
      if ('done' in data) return;
      if ('error' in data) throw new Error(data.error);
      if ('content' in data) yield data.content;
    }
  }
}
