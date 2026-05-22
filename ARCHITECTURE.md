# Architecture

## Ingestion Flow

Every LLM response goes through a synchronous-then-async two-phase pipeline.

**Synchronous (request path):**

1. `ChatService.streamChat` saves a `pending` user message row and publishes it to the `log.received` Redis stream.
2. It pre-creates a `pending` assistant message row so the row exists before ingestion writes to it.
3. `LlmService.trackStream` wraps the adapter's `AsyncIterable<string>`, measures latency and TTFT, and calls `IngestionService.log` once the stream ends (success or error).
4. `IngestionService.log` writes a `LlmInsight` row to Postgres, always publishes an `InferenceEvent` to `inference.events`, and — only on success when `messageId` and `outputContent` are present — also publishes a content payload to `log.received`.

**Asynchronous (worker path):**
The worker process (`main-worker.ts`) runs three independent consumer groups against two Redis streams:

| Consumer group   | Stream             | What it does                                                                                                                                               |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pii-redactor`   | `log.received`     | Applies regex redaction (email, phone, card, SSN) and writes the cleaned content back to the `messages` table; marks row `completed`.                      |
| `insight-engine` | `inference.events` | Writes error detail rows to `inference_errors` for failed inferences.                                                                                      |
| `metrics-agg`    | `inference.events` | Accumulates per-provider, per-minute token and latency buckets in memory; flushes sealed buckets to `inference_metrics_rollup` every 60 s using an upsert. |

The frontend receives chunks via SSE (`POST /chat`, with `sessionId` in the request body) and queries history (`GET /chat/:sessionId`) and dashboard metrics over REST.

---

## Logging Strategy

- **NestJS `Logger`** is used throughout worker services. Log levels: `debug` for per-message confirmations, `error` for stream read failures and flush failures.
- Errors include stack traces (`err.stack`) when available.
- The main API process does not have structured logging beyond NestJS defaults; all observability is captured in Postgres via the ingestion pipeline rather than log files.
- Error classification (`rate_limit`, `timeout`, `quota_exceeded`, `context_length`) happens in `LlmService` before the event is published, so the error type is queryable without log parsing.

---

## Scaling Considerations

- **Worker is a separate process** (`main-worker.ts` / `WorkerModule`) — it can be scaled independently of the API.
- **Redis Streams with consumer groups** allow multiple worker instances to compete for messages. Adding more replicas of the worker process increases throughput without code changes; each consumer registers under a stable group name (`pii-redactor`, `metrics-agg`, `insight-engine`).
- **Metrics aggregation is in-process memory** (the `buckets` map in `MetricsAggService`). This works for a single worker replica but will produce duplicate or split buckets across multiple replicas. Moving the accumulator to Redis (e.g. `HINCRBY`) or flushing at shorter intervals per-replica would be required for horizontal scale.
- The API itself is stateless (Postgres + Redis hold all state), so it can be horizontally scaled behind a load balancer without sticky sessions.
- Context window is capped at 10 messages (`CONTEXT_WINDOW = 10`) to bound prompt size.

---

## Failure Handling Assumptions

- **Unacknowledged stream messages are redelivered.** The PII redactor intentionally does not `ack` on DB update failure, so Redis will redeliver the message. The insight engine and metrics aggregator both `ack` immediately after local processing to avoid reprocessing on retry.
- **Orphaned assistant messages are deleted** if the LLM stream throws at any point — including mid-stream after partial chunks have been yielded. The `messageRepository.update` with full content only runs when the stream completes without error; the `catch` block always deletes and rethrows. On success, the full raw content is written synchronously, then the PII pipeline overwrites it asynchronously with the redacted version.
- **Metrics flush failures reinsert the bucket** into the in-memory map so it is retried on the next 60 s tick rather than silently dropped.
- **Consumer group creation is idempotent** — `BUSYGROUP` errors on `XGROUP CREATE` are swallowed; all other Redis errors propagate.
- **No dead-letter queue.** A message that repeatedly fails processing (e.g. malformed payload, persistent DB outage) will stay in the pending-entries list indefinitely. Adding `XAUTOCLAIM` with a retry cap would be needed for production resilience.
- **TypeORM `synchronize: true`** is set in the API process (`AppModule`) only — the worker process (`WorkerModule`) uses `synchronize: false`. Schema migrations therefore run automatically on API startup but not on worker startup. Both should be replaced with explicit migrations before production deployment.
