import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmFactory } from './llm.factory';
import { LlmService } from './llm.service';
import { IngestionModule } from '../ingestionService/ingestion.module';

@Module({
  imports: [ConfigModule, IngestionModule],
  providers: [LlmFactory, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
