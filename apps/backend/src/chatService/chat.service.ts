import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { Message } from '../entities/message.entity';
import { LlmService } from '../llmService/llm.service';
import type {
  CreateSessionDto,
  IMessage,
  ISession,
  PostChatDto,
} from '@app/types';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly llmService: LlmService,
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
        }),
      );
    }

    return {
      id: saved.id,
      provider: saved.provider,
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
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));
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
      createdAt: m.createdAt,
    }));
  }

  async *streamChat(dto: PostChatDto, session: Session): AsyncIterable<string> {
    await this.messageRepository.save(
      this.messageRepository.create({
        sessionId: dto.sessionId,
        role: 'user',
        content: dto.message,
      }),
    );

    let fullResponse = '';
    for await (const chunk of this.llmService.stream(
      session.provider,
      dto.message,
    )) {
      fullResponse += chunk;
      yield chunk;
    }

    await this.messageRepository.save(
      this.messageRepository.create({
        sessionId: dto.sessionId,
        role: 'llm',
        content: fullResponse,
      }),
    );
  }
}
