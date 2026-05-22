import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../entities/message.entity';
import { RedisStreamService } from '../../redis/redis-stream.service';

const STREAM = 'log.received';
const GROUP = 'pii-redactor';
const CONSUMER = 'worker-1';

const PII_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[EMAIL]',
  },
  {
    // Matches US/international phone numbers: +1 (800) 555-1234, 800-555-1234, etc.
    pattern: /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    replacement: '[PHONE]',
  },
  {
    // 13–16 digit card numbers with optional spaces or dashes
    pattern: /\b(?:\d[ -]?){13,15}\d\b/g,
    replacement: '[CREDIT_CARD]',
  },
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN]',
  },
];

@Injectable()
export class PiiRedactorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PiiRedactorService.name);
  private running = false;

  constructor(
    private readonly redisStream: RedisStreamService,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redisStream.createConsumerGroup(STREAM, GROUP);
    this.running = true;
    void this.processLoop();
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        const messages = await this.redisStream.readGroup(
          STREAM,
          GROUP,
          CONSUMER,
          10,
          5000,
        );

        for (const { id, payload } of messages) {
          try {
            const masked = this.redact(payload.content);
            await this.messageRepository.update(payload.messageId, {
              content: masked,
              status: 'completed',
            });
            await this.redisStream.ack(STREAM, GROUP, id);
            this.logger.debug(`Redacted message ${payload.messageId}`);
          } catch (err) {
            this.logger.error(
              `Failed to process stream entry ${id}`,
              err instanceof Error ? err.stack : err,
            );
            // Not ack'd — Redis will redeliver to this or another consumer
          }
        }
      } catch (err) {
        if (this.running) {
          this.logger.error(
            'Stream read error',
            err instanceof Error ? err.stack : err,
          );
        }
      }
    }
  }

  private redact(text: string): string {
    let result = text;
    for (const { pattern, replacement } of PII_PATTERNS) {
      result = result.replace(pattern, replacement);
    }
    return result;
  }
}
