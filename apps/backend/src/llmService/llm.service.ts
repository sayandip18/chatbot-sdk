import { Injectable } from '@nestjs/common';
import { LlmFactory } from './llm.factory';
import { StreamOptions } from './base-llm.interface';

@Injectable()
export class LlmService {
  constructor(private readonly factory: LlmFactory) {}

  stream(
    provider: string,
    prompt: string,
    options?: StreamOptions,
  ): AsyncIterable<string> {
    const client = this.factory.getClient(provider);
    return client.stream(prompt, options);
  }
}
