import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmInsight } from '../entities/llm-insight.entity';
import { RedisStreamService } from '../redis/redis-stream.service';

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
    const { outputContent, ...insightData } = dto;
    await this.insightRepository.save(
      this.insightRepository.create(insightData),
    );

    if (dto.status === 'success' && dto.messageId && outputContent) {
      await this.redisStream.publish('log.received', {
        messageId: dto.messageId,
        sessionId: dto.sessionId,
        role: 'llm',
        content: outputContent,
      });
    }
  }
}
