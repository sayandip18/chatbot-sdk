import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('llm_insights')
export class LlmInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Logical reference — no FK constraint since the row is written before the message is committed
  @Column({ type: 'uuid', nullable: true, name: 'message_id' })
  messageId: string | null;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'int', nullable: true, name: 'input_tokens' })
  inputTokens: number | null;

  @Column({ type: 'int', nullable: true, name: 'output_tokens' })
  outputTokens: number | null;

  @Column({ type: 'int', nullable: true, name: 'latency_ms' })
  latencyMs: number | null;

  @Column({ type: 'int', nullable: true, name: 'ttft_ms' })
  ttftMs: number | null;

  @Column({ type: 'varchar', length: 20 })
  status: 'success' | 'error';

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'error_type' })
  errorType: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'input_preview' })
  inputPreview: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, name: 'output_preview' })
  outputPreview: string | null;

  @Column({ type: 'timestamptz', name: 'requested_at' })
  requestedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'responded_at' })
  respondedAt: Date | null;
}
