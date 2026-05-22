import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

export interface StreamEvent {
  messageId: string;
  sessionId: string;
  role: 'user' | 'llm';
  content: string;
}

type XReadGroupResult = [string, [string, string[]][]][] | null;

@Injectable()
export class RedisStreamService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async publish(stream: string, payload: StreamEvent): Promise<void> {
    await this.redis.xadd(stream, '*', 'data', JSON.stringify(payload));
  }

  async createConsumerGroup(stream: string, group: string): Promise<void> {
    try {
      await this.redis.xgroup('CREATE', stream, group, '$', 'MKSTREAM');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('BUSYGROUP')) throw err;
    }
  }

  async readGroup(
    stream: string,
    group: string,
    consumer: string,
    count: number,
    blockMs: number,
  ): Promise<Array<{ id: string; payload: StreamEvent }>> {
    const raw = (await this.redis.xreadgroup(
      'GROUP',
      group,
      consumer,
      'COUNT',
      count,
      'BLOCK',
      blockMs,
      'STREAMS',
      stream,
      '>',
    )) as unknown as XReadGroupResult;

    if (!raw) return [];

    const out: Array<{ id: string; payload: StreamEvent }> = [];
    for (const [, entries] of raw) {
      for (const [id, fields] of entries) {
        const dataIdx = fields.indexOf('data');
        if (dataIdx === -1) continue;
        out.push({
          id,
          payload: JSON.parse(fields[dataIdx + 1]) as StreamEvent,
        });
      }
    }
    return out;
  }

  async ack(stream: string, group: string, id: string): Promise<void> {
    await this.redis.xack(stream, group, id);
  }
}
