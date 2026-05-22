import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('inference_metrics_rollup')
@Unique('idx_metrics_rollup_lookup', ['bucketTimestamptz', 'provider', 'model'])
export class InferenceMetricsRollup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamptz', name: 'bucket_timestamptz' })
  bucketTimestamptz: Date;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 100, default: 'unknown' })
  model: string;

  @Column({ type: 'int', default: 0, name: 'total_requests' })
  totalRequests: number;

  @Column({ type: 'int', default: 0, name: 'successful_requests' })
  successfulRequests: number;

  @Column({ type: 'int', default: 0, name: 'failed_requests' })
  failedRequests: number;

  @Column({ type: 'int', default: 0, name: 'total_input_tokens' })
  totalInputTokens: number;

  @Column({ type: 'int', default: 0, name: 'total_output_tokens' })
  totalOutputTokens: number;

  @Column({ type: 'int', nullable: true, name: 'p50_latency_ms' })
  p50LatencyMs: number | null;

  @Column({ type: 'int', nullable: true, name: 'p90_latency_ms' })
  p90LatencyMs: number | null;

  @Column({ type: 'int', nullable: true, name: 'p99_latency_ms' })
  p99LatencyMs: number | null;

  @Column({ type: 'int', nullable: true, name: 'avg_ttft_ms' })
  avgTtftMs: number | null;
}
