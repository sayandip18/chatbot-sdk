import { randomUUID } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { Message } from '../entities/message.entity';
import { LlmService, IngestionContext } from '../llmService/llm.service';
import { RedisStreamService } from '../redis/redis-stream.service';
import type { ChatMessage } from '../llmService/base-llm.interface';
import type {
  CreateSessionDto,
  IMessage,
  ISession,
  PatchSessionDto,
  PostChatDto,
} from '@app/types';

const CONTEXT_WINDOW = 10;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly llmService: LlmService,
    private readonly redisStream: RedisStreamService,
  ) {}

  async createSession(dto: CreateSessionDto): Promise<ISession> {
    const session = this.sessionRepository.create({ provider: dto.provider });
    const saved = await this.sessionRepository.save(session);

    if (dto.systemPrompt) {
      await this.messageRepository.save(
        this.messageRepository.create({
          sessionId: saved.id,
          role: 'system',
          content: dto.systemPrompt,
          status: 'completed',
        }),
      );
    }

    return {
      id: saved.id,
      provider: saved.provider,
      isCancelled: saved.isCancelled,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async getAllSessions(): Promise<ISession[]> {
    const sessions = await this.sessionRepository.find({
      order: { createdAt: 'DESC' },
    });
    return sessions.map((s) => ({
      id: s.id,
      provider: s.provider,
      isCancelled: s.isCancelled,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
  }

  async patchSession(
    sessionId: string,
    dto: PatchSessionDto,
  ): Promise<ISession> {
    const session = await this.validateSession(sessionId);
    session.isCancelled = dto.isCancelled;
    const saved = await this.sessionRepository.save(session);
    return {
      id: saved.id,
      provider: saved.provider,
      isCancelled: saved.isCancelled,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async validateSession(sessionId: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }
    return session;
  }

  async getChatHistory(sessionId: string): Promise<IMessage[]> {
    await this.validateSession(sessionId);
    const messages = await this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
    return messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      status: m.status,
      createdAt: m.createdAt,
    }));
  }

  async *streamChat(dto: PostChatDto, session: Session): AsyncIterable<string> {
    if (session.isCancelled) {
      throw new ForbiddenException('Session is cancelled');
    }
    // 1. Save user message as pending and publish to PII pipeline
    const userMsg = await this.messageRepository.save(
      this.messageRepository.create({
        sessionId: dto.sessionId,
        role: 'user',
        content: dto.message,
        status: 'pending',
      }),
    );

    await this.redisStream.publish('log.received', {
      messageId: userMsg.id,
      sessionId: dto.sessionId,
      role: 'user',
      content: dto.message,
    });

    const systemMessage = await this.messageRepository.findOne({
      where: { sessionId: dto.sessionId, role: 'system' },
    });

    const recentMessages = await this.messageRepository.find({
      where: { sessionId: dto.sessionId, role: Not('system') },
      order: { createdAt: 'DESC' },
      take: CONTEXT_WINDOW,
    });
    recentMessages.reverse();

    const messages: ChatMessage[] = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage.content });
    }
    for (const m of recentMessages) {
      messages.push({
        role: m.role === 'llm' ? 'assistant' : m.role,
        content: m.content,
      });
    }

    // 2. Pre-save LLM placeholder so the row exists before ingestion publishes the event
    const assistantMessageId = randomUUID();
    await this.messageRepository.save(
      this.messageRepository.create({
        id: assistantMessageId,
        sessionId: dto.sessionId,
        role: 'llm',
        content: '',
        status: 'pending',
      }),
    );

    const ingestionContext: IngestionContext = {
      messageId: assistantMessageId,
      sessionId: dto.sessionId,
      provider: session.provider,
      inputPreview: dto.message.slice(0, 200),
    };

    // 3. Stream — ingestionService will publish the LLM event with full content on success.
    //    PII redactor owns the final content write; we eagerly write raw content here so the
    //    row is readable immediately, before the async pipeline completes.
    let fullContent = '';
    try {
      for await (const chunk of this.llmService.stream(
        session.provider,
        messages,
        undefined,
        ingestionContext,
      )) {
        fullContent += chunk;
        yield chunk;
      }
      await this.messageRepository.update(assistantMessageId, {
        content: fullContent,
      });
    } catch (error) {
      // Clean up orphaned placeholder on stream failure
      await this.messageRepository.delete(assistantMessageId);
      throw error;
    }
  }
}
