import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('llm_insights')
export class LlmInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Logical reference — no FK constraint since the row is written before the message is committed
  @Column({ type: 'uuid', nullable: true })
  messageId: string | null;

  @Column({ type: 'uuid' })
  sessionId: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'int', nullable: true })
  inputTokens: number | null;

  @Column({ type: 'int', nullable: true })
  outputTokens: number | null;

  @Column({ type: 'int', nullable: true })
  latencyMs: number | null;

  @Column({ type: 'int', nullable: true })
  ttftMs: number | null;

  @Column({ type: 'varchar', length: 20 })
  status: 'success' | 'error';

  @Column({ type: 'varchar', length: 50, nullable: true })
  errorType: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  inputPreview: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  outputPreview: string | null;

  @Column({ type: 'timestamptz' })
  requestedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;
}
