import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InferenceError } from '../../entities/inference-error.entity';
import { RedisStreamService } from '../../redis/redis-stream.service';
import { InferenceEvent } from '../inference-event.interface';

const STREAM = 'inference.events';
const GROUP = 'insight-engine';
const CONSUMER = 'worker-1';

@Injectable()
export class InsightEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InsightEngineService.name);
  private running = false;

  constructor(
    private readonly redisStream: RedisStreamService,
    @InjectRepository(InferenceError)
    private readonly errorRepo: Repository<InferenceError>,
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
        const messages = await this.redisStream.readGroup<InferenceEvent>(
          STREAM,
          GROUP,
          CONSUMER,
          10,
          5000,
        );

        for (const { id, payload } of messages) {
          try {
            if (payload.status === 'error') {
              await this.errorRepo.save(
                this.errorRepo.create({
                  conversationId: payload.conversationId,
                  requestId: payload.requestId || null,
                  provider: payload.provider,
                  model: payload.model,
                  errorType: payload.errorType ?? 'unknown',
                  httpStatus: payload.httpStatus,
                  errorMessage: payload.errorMessage ?? 'unknown error',
                  errorDetails: payload.errorDetails,
                  requestSnapshot: null,
                }),
              );
              this.logger.debug(
                `Recorded error for conversation ${payload.conversationId}: ${payload.errorType}`,
              );
            }
            await this.redisStream.ack(STREAM, GROUP, id);
          } catch (err) {
            this.logger.error(
              `Failed to process stream entry ${id}`,
              err instanceof Error ? err.stack : err,
            );
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
}
