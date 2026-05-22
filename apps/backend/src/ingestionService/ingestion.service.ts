import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmInsight } from '../entities/llm-insight.entity';
import { RedisStreamService } from '../redis/redis-stream.service';
import { InferenceEvent } from '../worker/inference-event.interface';

export interface LogInsightDto {
  messageId: string | null;
  sessionId: string;
  provider: string;
  inputTokens: number | null;
  outputTokens: number | null;
  latencyMs: number;
  ttftMs: number | null;
  status: 'success' | 'error';
  errorType: string | null;
  httpStatus: number | null;
  errorMessage: string | null;
  errorDetails: Record<string, unknown> | null;
  inputPreview: string | null;
  outputPreview: string | null;
  outputContent: string | null;
  requestedAt: Date;
  respondedAt: Date | null;
}

@Injectable()
export class IngestionService {
  constructor(
    @InjectRepository(LlmInsight)
    private readonly insightRepository: Repository<LlmInsight>,
    private readonly redisStream: RedisStreamService,
  ) {}

  async log(dto: LogInsightDto): Promise<void> {
    const {
      outputContent,
      httpStatus,
      errorMessage,
      errorDetails,
      ...insightData
    } = dto;
    await this.insightRepository.save(
      this.insightRepository.create(insightData),
    );

    const event: InferenceEvent = {
      requestId: dto.messageId ?? '',
      conversationId: dto.sessionId,
      provider: dto.provider,
      model: 'unknown',
      status: dto.status,
      inputTokens: dto.inputTokens,
      outputTokens: dto.outputTokens,
      latencyMs: dto.latencyMs,
      ttftMs: dto.ttftMs,
      errorType: dto.errorType,
      httpStatus,
      errorMessage,
      errorDetails,
      requestedAt: dto.requestedAt.toISOString(),
    };
    await this.redisStream.publish<InferenceEvent>('inference.events', event);

    if (dto.status === 'success' && dto.messageId && outputContent) {
      await this.redisStream.publish('log.received', {
        messageId: dto.messageId,
        sessionId: dto.sessionId,
        role: 'llm' as const,
        content: outputContent,
      });
    }
  }
}
