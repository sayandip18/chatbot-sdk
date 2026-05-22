import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from '../entities/message.entity';
import { Session } from '../entities/session.entity';
import { LlmModule } from '../llmService/llm.module';
import { RedisModule } from '../redis/redis.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Message]),
    LlmModule,
    RedisModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
