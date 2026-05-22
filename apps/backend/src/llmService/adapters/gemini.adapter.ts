import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AdapterMeta,
  BaseLLM,
  ChatMessage,
  StreamOptions,
  StreamResult,
} from '../base-llm.interface';

export class GeminiAdapter implements BaseLLM {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
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
    const { model = 'gemini-2.0-flash', temperature, maxTokens } = options;
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;

    try {
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

      const response = await result.response;
      const usage = response.usageMetadata;
      if (usage) {
        inputTokens = usage.promptTokenCount ?? null;
        outputTokens = usage.candidatesTokenCount ?? null;
      }
    } finally {
      resolveMeta({ inputTokens, outputTokens });
    }
  }
}
