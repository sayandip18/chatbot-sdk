import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseLLM, StreamOptions } from '../base-llm.interface';

export class GeminiAdapter implements BaseLLM {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async *stream(
    prompt: string,
    options: StreamOptions = {},
  ): AsyncIterable<string> {
    const { model = 'gemini-1.5-flash', temperature, maxTokens } = options;

    const genModel = this.genAI.getGenerativeModel({
      model,
      generationConfig: {
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxOutputTokens: maxTokens }),
      },
    });

    const result = await genModel.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}
