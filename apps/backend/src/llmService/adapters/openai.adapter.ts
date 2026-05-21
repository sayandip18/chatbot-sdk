import OpenAI from 'openai';
import { BaseLLM, ChatMessage, StreamOptions } from '../base-llm.interface';

export class OpenAIAdapter implements BaseLLM {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *stream(
    messages: ChatMessage[],
    options: StreamOptions = {},
  ): AsyncIterable<string> {
    const { model = 'gpt-4o-mini', temperature, maxTokens } = options;

    const completion = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
      ...(temperature !== undefined && { temperature }),
      ...(maxTokens !== undefined && { max_tokens: maxTokens }),
    });

    for await (const chunk of completion) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
