import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LlmFactory } from './llm.factory';
import { LlmService } from './llm.service';

@Module({
  imports: [ConfigModule],
  providers: [LlmFactory, LlmService],
  exports: [LlmService],
})
export class LlmModule {}
