import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('inference_metrics_rollup')
@Unique('idx_metrics_rollup_lookup', ['bucketTimestamptz', 'provider', 'model'])
export class InferenceMetricsRollup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'timestamptz' })
  bucketTimestamptz: Date;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 100, default: 'unknown' })
  model: string;

  @Column({ type: 'int', default: 0 })
  totalRequests: number;

  @Column({ type: 'int', default: 0 })
  successfulRequests: number;

  @Column({ type: 'int', default: 0 })
  failedRequests: number;

  @Column({ type: 'int', default: 0 })
  totalInputTokens: number;

  @Column({ type: 'int', default: 0 })
  totalOutputTokens: number;

  @Column({ type: 'int', nullable: true })
  p50LatencyMs: number | null;

  @Column({ type: 'int', nullable: true })
  p90LatencyMs: number | null;

  @Column({ type: 'int', nullable: true })
  p99LatencyMs: number | null;

  @Column({ type: 'int', nullable: true })
  avgTtftMs: number | null;
}
