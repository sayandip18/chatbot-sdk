import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type {
  CreateSessionDto,
  IMessage,
  ISession,
  PatchSessionDto,
  PostChatDto,
  SSEEvent,
} from '@app/types';
import { ChatService } from './chat.service';

@Controller()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  createSession(@Body() dto: CreateSessionDto): Promise<ISession> {
    return this.chatService.createSession(dto);
  }

  @Get('sessions')
  getSessions(): Promise<ISession[]> {
    return this.chatService.getAllSessions();
  }

  @Patch('sessions/:sessionId')
  patchSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: PatchSessionDto,
  ): Promise<ISession> {
    return this.chatService.patchSession(sessionId, dto);
  }

  @Get('chat/:sessionId')
  getChatHistory(@Param('sessionId') sessionId: string): Promise<IMessage[]> {
    return this.chatService.getChatHistory(sessionId);
  }

  @Post('chat')
  async chat(@Body() dto: PostChatDto, @Res() res: Response): Promise<void> {
    let session: Awaited<ReturnType<typeof this.chatService.validateSession>>;
    try {
      session = await this.chatService.validateSession(dto.sessionId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        res.status(HttpStatus.NOT_FOUND).json({ message: error.message });
        return;
      }
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: 'Internal server error' });
      return;
    }

    if (session.isCancelled) {
      res.status(HttpStatus.FORBIDDEN).json({ message: 'Session is cancelled' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const writeEvent = (event: SSEEvent): void => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    try {
      for await (const chunk of this.chatService.streamChat(dto, session)) {
        writeEvent({ content: chunk });
      }
      writeEvent({ done: true });
    } catch (error) {
      writeEvent({
        error: error instanceof Error ? error.message : 'Stream error',
      });
    } finally {
      res.end();
    }
  }
}
