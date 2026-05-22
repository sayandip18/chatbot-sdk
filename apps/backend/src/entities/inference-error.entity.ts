import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('inference_errors')
@Index('idx_errors_timestamp', ['timestamp'])
@Index('idx_errors_type_provider', ['errorType', 'provider'])
export class InferenceError {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  timestamp: Date;

  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  @Column({ type: 'uuid', nullable: true, name: 'request_id' })
  requestId: string | null;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 100, default: 'unknown' })
  model: string;

  @Column({ type: 'varchar', length: 50, name: 'error_type' })
  errorType: string;

  @Column({ type: 'int', nullable: true, name: 'http_status' })
  httpStatus: number | null;

  @Column({ type: 'text', name: 'error_message' })
  errorMessage: string;

  @Column({ type: 'jsonb', nullable: true, name: 'error_details' })
  errorDetails: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true, name: 'request_snapshot' })
  requestSnapshot: Record<string, unknown> | null;
}
