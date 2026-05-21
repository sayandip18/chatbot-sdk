import OpenAI from 'openai';
import { BaseLLM, StreamOptions } from '../base-llm.interface';

export class OpenAIAdapter implements BaseLLM {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *stream(
    prompt: string,
    options: StreamOptions = {},
  ): AsyncIterable<string> {
    const { model = 'gpt-4o-mini', temperature, maxTokens } = options;

    const completion = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
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
