import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmInsight } from '../entities/llm-insight.entity';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [TypeOrmModule.forFeature([LlmInsight])],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
