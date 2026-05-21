import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseLLM, ChatMessage, StreamOptions } from '../base-llm.interface';

export class GeminiAdapter implements BaseLLM {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async *stream(
    messages: ChatMessage[],
    options: StreamOptions = {},
  ): AsyncIterable<string> {
    const { model = 'gemini-1.5-flash', temperature, maxTokens } = options;

    const systemMessage = messages.find((m) => m.role === 'system');
    const turns = messages.filter((m) => m.role !== 'system');

    const lastTurn = turns[turns.length - 1];
    const history = turns.slice(0, -1);

    const genModel = this.genAI.getGenerativeModel({
      model,
      ...(systemMessage && { systemInstruction: systemMessage.content }),
      generationConfig: {
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxOutputTokens: maxTokens }),
      },
    });

    const chat = genModel.startChat({
      history: history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    });

    const result = await chat.sendMessageStream(lastTurn.content);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }
}
