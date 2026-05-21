import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmInsight } from '../entities/llm-insight.entity';

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
  requestedAt: Date;
  respondedAt: Date | null;
}

@Injectable()
export class IngestionService {
  constructor(
    @InjectRepository(LlmInsight)
    private readonly insightRepository: Repository<LlmInsight>,
  ) {}

  async log(dto: LogInsightDto): Promise<void> {
    await this.insightRepository.save(this.insightRepository.create(dto));
  }
}
