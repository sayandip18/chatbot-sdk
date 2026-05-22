import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InferenceMetricsRollup } from '../../entities/inference-metrics-rollup.entity';
import { RedisStreamService } from '../../redis/redis-stream.service';
import { InferenceEvent } from '../inference-event.interface';

const STREAM = 'inference.events';
const GROUP = 'metrics-agg';
const CONSUMER = 'worker-1';
const FLUSH_INTERVAL_MS = 60_000;

interface BucketAccumulator {
  provider: string;
  bucketTs: Date;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  latencies: number[];
  ttftValues: number[];
}

function bucketKey(provider: string, bucketTs: Date): string {
  return `${bucketTs.toISOString()}::${provider}`;
}

function floorToMinute(date: Date): Date {
  return new Date(Math.floor(date.getTime() / 60_000) * 60_000);
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

@Injectable()
export class MetricsAggService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsAggService.name);
  private running = false;
  private readonly buckets = new Map<string, BucketAccumulator>();
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly redisStream: RedisStreamService,
    @InjectRepository(InferenceMetricsRollup)
    private readonly rollupRepo: Repository<InferenceMetricsRollup>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.redisStream.createConsumerGroup(STREAM, GROUP);
    this.running = true;
    this.flushTimer = setInterval(() => void this.flush(), FLUSH_INTERVAL_MS);
    void this.processLoop();
  }

  onModuleDestroy(): void {
    this.running = false;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  private async processLoop(): Promise<void> {
    while (this.running) {
      try {
        const messages = await this.redisStream.readGroup<InferenceEvent>(
          STREAM,
          GROUP,
          CONSUMER,
          50,
          5000,
        );

        for (const { id, payload } of messages) {
          try {
            this.accumulate(payload);
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

  private accumulate(event: InferenceEvent): void {
    const requestedAt = new Date(event.requestedAt);
    const bucketTs = floorToMinute(requestedAt);
    const key = bucketKey(event.provider, bucketTs);

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        provider: event.provider,
        bucketTs,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        latencies: [],
        ttftValues: [],
      };
      this.buckets.set(key, bucket);
    }

    bucket.totalRequests++;
    if (event.status === 'success') {
      bucket.successfulRequests++;
    } else {
      bucket.failedRequests++;
    }
    bucket.totalInputTokens += event.inputTokens ?? 0;
    bucket.totalOutputTokens += event.outputTokens ?? 0;
    bucket.latencies.push(event.latencyMs);
    if (event.ttftMs !== null) {
      bucket.ttftValues.push(event.ttftMs);
    }
  }

  private async flush(): Promise<void> {
    if (this.buckets.size === 0) return;

    const currentBucketTs = floorToMinute(new Date());
    const toFlush: BucketAccumulator[] = [];

    for (const [key, bucket] of this.buckets) {
      // Only flush sealed buckets (strictly before the current minute)
      if (bucket.bucketTs < currentBucketTs) {
        toFlush.push(bucket);
        this.buckets.delete(key);
      }
    }

    if (toFlush.length === 0) return;

    for (const bucket of toFlush) {
      try {
        const sorted = [...bucket.latencies].sort((a, b) => a - b);

        await this.rollupRepo
          .createQueryBuilder()
          .insert()
          .into(InferenceMetricsRollup)
          .values({
            bucketTimestamptz: bucket.bucketTs,
            provider: bucket.provider,
            model: 'unknown',
            totalRequests: bucket.totalRequests,
            successfulRequests: bucket.successfulRequests,
            failedRequests: bucket.failedRequests,
            totalInputTokens: bucket.totalInputTokens,
            totalOutputTokens: bucket.totalOutputTokens,
            p50LatencyMs: percentile(sorted, 50),
            p90LatencyMs: percentile(sorted, 90),
            p99LatencyMs: percentile(sorted, 99),
            avgTtftMs: average(bucket.ttftValues),
          })
          .orUpdate(
            [
              'total_requests',
              'successful_requests',
              'failed_requests',
              'total_input_tokens',
              'total_output_tokens',
              'p50_latency_ms',
              'p90_latency_ms',
              'p99_latency_ms',
              'avg_ttft_ms',
            ],
            ['bucket_timestamptz', 'provider', 'model'],
          )
          .execute();

        this.logger.debug(
          `Flushed bucket ${bucket.bucketTs.toISOString()} / ${bucket.provider}: ${bucket.totalRequests} requests`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to flush bucket ${bucket.bucketTs.toISOString()}`,
          err instanceof Error ? err.stack : err,
        );
        // Put the bucket back so it can be retried on the next flush
        const key = bucketKey(bucket.provider, bucket.bucketTs);
        this.buckets.set(key, bucket);
      }
    }
  }
}
