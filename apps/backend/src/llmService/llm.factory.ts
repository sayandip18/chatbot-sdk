import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseLLM } from './base-llm.interface';
import { OpenAIAdapter } from './adapters/openai.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';

@Injectable()
export class LlmFactory {
  constructor(private readonly configService: ConfigService) {}

  getClient(provider: string): BaseLLM {
    const p = provider.toLowerCase().trim();

    if (['openai', 'gpt'].includes(p)) {
      const apiKey = this.configService.getOrThrow<string>('OPENAI_API_KEY');
      return new OpenAIAdapter(apiKey);
    }

    if (['google', 'gemini'].includes(p)) {
      const apiKey = this.configService.getOrThrow<string>('GEMINI_API_KEY');
      return new GeminiAdapter(apiKey);
    }

    throw new Error(
      `Unsupported provider: "${provider}". Supported values: openai, gpt, google, gemini`,
    );
  }
}
