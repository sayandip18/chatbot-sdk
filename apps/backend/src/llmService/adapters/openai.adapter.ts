import OpenAI from 'openai';
import {
  AdapterMeta,
  BaseLLM,
  ChatMessage,
  StreamOptions,
  StreamResult,
} from '../base-llm.interface';

export class OpenAIAdapter implements BaseLLM {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  stream(messages: ChatMessage[], options: StreamOptions = {}): StreamResult {
    let resolveMeta!: (meta: AdapterMeta) => void;
    const meta = new Promise<AdapterMeta>((resolve) => {
      resolveMeta = resolve;
    });
    return { stream: this._stream(messages, options, resolveMeta), meta };
  }

  private async *_stream(
    messages: ChatMessage[],
    options: StreamOptions,
    resolveMeta: (meta: AdapterMeta) => void,
  ): AsyncIterable<string> {
    const { model = 'gpt-4o-mini', temperature, maxTokens } = options;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;

    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        stream_options: { include_usage: true },
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { max_tokens: maxTokens }),
      });

      for await (const chunk of completion) {
        if (chunk.usage) {
          inputTokens = chunk.usage.prompt_tokens;
          outputTokens = chunk.usage.completion_tokens;
        }
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
    } finally {
      resolveMeta({ inputTokens, outputTokens });
    }
  }
}
