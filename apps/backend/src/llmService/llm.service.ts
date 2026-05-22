import { Injectable } from '@nestjs/common';
import { LlmFactory } from './llm.factory';
import { AdapterMeta, ChatMessage, StreamOptions } from './base-llm.interface';
import { IngestionService } from '../ingestionService/ingestion.service';

export interface IngestionContext {
  messageId: string;
  sessionId: string;
  provider: string;
  inputPreview: string;
}

function classifyError(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown';
  const msg = error.message.toLowerCase();
  if (msg.includes('rate limit') || msg.includes('rate_limit'))
    return 'rate_limit';
  if (msg.includes('timeout')) return 'timeout';
  if (msg.includes('quota')) return 'quota_exceeded';
  if (msg.includes('context length') || msg.includes('max_tokens'))
    return 'context_length';
  return error.name ?? 'unknown';
}

@Injectable()
export class LlmService {
  constructor(
    private readonly factory: LlmFactory,
    private readonly ingestionService: IngestionService,
  ) {}

  stream(
    provider: string,
    messages: ChatMessage[],
    options?: StreamOptions,
    context?: IngestionContext,
  ): AsyncIterable<string> {
    const result = this.factory.getClient(provider).stream(messages, options);
    return this.trackStream(result.stream, result.meta, context);
  }

  private async *trackStream(
    adapterStream: AsyncIterable<string>,
    adapterMeta: Promise<AdapterMeta>,
    context: IngestionContext | undefined,
  ): AsyncIterable<string> {
    const requestedAt = new Date();
    const startMs = Date.now();
    let ttftMs: number | null = null;
    let outputPreview = '';
    let inputTokens: number | null = null;
    let outputTokens: number | null = null;

    try {
      for await (const chunk of adapterStream) {
        if (ttftMs === null) ttftMs = Date.now() - startMs;
        outputPreview += chunk;
        yield chunk;
      }

      const meta: AdapterMeta = await adapterMeta;
      inputTokens = meta.inputTokens;
      outputTokens = meta.outputTokens;

      if (context) {
        await this.ingestionService.log({
          messageId: context.messageId,
          sessionId: context.sessionId,
          provider: context.provider,
          inputTokens,
          outputTokens,
          latencyMs: Date.now() - startMs,
          ttftMs,
          status: 'success',
          errorType: null,
          inputPreview: context.inputPreview,
          outputPreview: outputPreview.slice(0, 200),
          outputContent: outputPreview,
          requestedAt,
          respondedAt: new Date(),
        });
      }
    } catch (streamError) {
      try {
        const meta: AdapterMeta = await adapterMeta;
        inputTokens = meta.inputTokens;
        outputTokens = meta.outputTokens;
      } catch {
        // keep null defaults
      }

      if (context) {
        await this.ingestionService.log({
          messageId: context.messageId,
          sessionId: context.sessionId,
          provider: context.provider,
          inputTokens,
          outputTokens,
          latencyMs: Date.now() - startMs,
          ttftMs,
          status: 'error',
          errorType: classifyError(streamError),
          inputPreview: context.inputPreview,
          outputPreview: outputPreview.slice(0, 200) || null,
          outputContent: null,
          requestedAt,
          respondedAt: new Date(),
        });
      }

      throw streamError;
    }
  }
}
