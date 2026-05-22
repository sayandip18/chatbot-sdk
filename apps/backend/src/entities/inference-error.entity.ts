import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inference_errors')
@Index('idx_errors_timestamp', ['timestamp'])
@Index('idx_errors_type_provider', ['errorType', 'provider'])
export class InferenceError {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ type: 'uuid' })
  conversationId: string;

  @Column({ type: 'uuid', nullable: true })
  requestId: string | null;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 100, default: 'unknown' })
  model: string;

  @Column({ type: 'varchar', length: 50 })
  errorType: string;

  @Column({ type: 'int', nullable: true })
  httpStatus: number | null;

  @Column({ type: 'text' })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  requestSnapshot: Record<string, unknown> | null;
}
