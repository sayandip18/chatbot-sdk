import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LlmInsight } from '../entities/llm-insight.entity';
import { IngestionService } from './ingestion.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([LlmInsight]), RedisModule],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
