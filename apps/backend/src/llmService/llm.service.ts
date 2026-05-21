import { Injectable } from '@nestjs/common';
import { LlmFactory } from './llm.factory';
import { ChatMessage, StreamOptions } from './base-llm.interface';

@Injectable()
export class LlmService {
  constructor(private readonly factory: LlmFactory) {}

  stream(
    provider: string,
    messages: ChatMessage[],
    options?: StreamOptions,
  ): AsyncIterable<string> {
    const client = this.factory.getClient(provider);
    return client.stream(messages, options);
  }
}
