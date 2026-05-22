Chatbot Insight Extractor

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 10+
- PostgreSQL running locally (default: `localhost:5432`, database `chatbot`)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment file and fill in your API keys:

   ```bash
   cp .env.example .env
   ```

   Required variables:

   | Variable         | Description                             |
   | ---------------- | --------------------------------------- |
   | `OPENAI_API_KEY` | OpenAI API key                          |
   | `GEMINI_API_KEY` | Google Gemini API key                   |
   | `DB_HOST`        | Postgres host (default: `localhost`)    |
   | `DB_PORT`        | Postgres port (default: `5432`)         |
   | `DB_USERNAME`    | Postgres user (default: `postgres`)     |
   | `DB_PASSWORD`    | Postgres password (default: `postgres`) |
   | `DB_NAME`        | Database name (default: `chatbot`)      |

## Running

Start both the backend and frontend in watch mode:

```bash
pnpm dev
```

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:5173 |
| Backend API | http://localhost:3000 |

## Architecture

```
[User Browser]
   │
   │ 1. Send Message
   ▼
[Chatbot App Server]
   │
   ├─► 2. Save Message to DB immediately (Status: Pending)
   │
   ├─► 3. Call LLM API (Stream or Unary)
   │     │
   │     └─► 4. Stream tokens back to User & Append to DB (Status: Success)
   │
   └─► 5. (BACKGROUND / FIRE-AND-FORGET)
          SDK extracts metadata -> Fires to Ingestion API -> Publishes to Queue
```

```
[Chat App + SDK]
       │
       ▼
[Ingestion API] ──(Write)──> [llm_insights]
       │
       ├── "log.received" ────────────────────────────────────────────────┐
       └── "inference.events" ───────────────────────┐                    │
                                                      │                    │
                                    ┌─────────────────┴────────────────────┴───┐
                                    │       Message Bus (Redis Streams)         │
                                    └──────────┬──────────────────┬─────────────┘
                                               │                  │
                           ┌───────────────────┘                  │
                 "inference.events"                         "log.received"
                           │                                       │
              ┌────────────┴────────────┐                         │
              ▼                         ▼                          ▼
    ┌─────────────────┐     ┌─────────────────────┐    ┌─────────────────┐
    │  Metrics Agg.   │     │   Insight Engine    │    │  PII Redactor   │
    └────────┬────────┘     └──────────┬──────────┘    └────────┬────────┘
             │ 1-min rollup            │ errors only             │ mask PII
             ▼                         ▼                          ▼
  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
  │ inference_metrics_   │  │  inference_errors    │  │    messages      │
  │       rollup         │  └──────────────────────┘  └──────────────────┘
  └──────────────────────┘
```

## Ingestion Service

Every LLM turn is automatically logged to the `llm_insights` table — no extra configuration required. The table is created on first boot via TypeORM `synchronize: true`.

### What is captured

| Column           | Description                                              |
| ---------------- | -------------------------------------------------------- |
| `session_id`     | Foreign key to the session                               |
| `message_id`     | UUID of the assistant message (set before stream starts) |
| `provider`       | LLM provider (`openai`, `google`, etc.)                  |
| `input_tokens`   | Prompt token count (from provider's stream usage event)  |
| `output_tokens`  | Completion token count                                   |
| `latency_ms`     | Total wall-clock time from request to stream close       |
| `ttft_ms`        | Time-to-first-token (ms from request to first chunk)     |
| `status`         | `success` or `error`                                     |
| `error_type`     | Classified error (`rate_limit`, `timeout`, etc.)         |
| `input_preview`  | First 200 chars of the user prompt                       |
| `output_preview` | First 200 chars of the assistant response                |
| `requested_at`   | Timestamp when the LLM request was initiated             |
| `responded_at`   | Timestamp when the stream closed                         |

### How it works

1. `ChatService` pre-generates a UUID for the assistant message and passes it with the session context to `LlmService`.
2. `LlmService` wraps the adapter stream, tracking TTFT and total latency as chunks flow through.
3. Adapters surface real token counts via provider stream events (OpenAI `stream_options.include_usage`, Gemini `usageMetadata`).
4. After the last chunk is yielded, `LlmService` writes the insight row — then `ChatService` persists the assistant message using the same pre-generated UUID for correlation.
5. On stream errors, a row is still written with `status = error` and a classified `error_type`.
6. After every write, `IngestionService` publishes an `InferenceEvent` to the `inference.events` stream (consumed by the Metrics Aggregator and Insight Engine workers). On success it additionally publishes to `log.received` for PII redaction.

### Worker services

| Worker | Stream | Output table | Behaviour |
| --- | --- | --- | --- |
| **PII Redactor** | `log.received` | `messages` | Masks emails, phone numbers, card numbers, and SSNs in assistant content, then marks the message `completed`. |
| **Metrics Aggregator** | `inference.events` | `inference_metrics_rollup` | Accumulates all events into in-memory 1-minute buckets per provider. Flushes sealed buckets every 60 s with pre-computed P50/P90/P99 latency percentiles via an upsert on `(bucket_timestamptz, provider, model)`. |
| **Insight Engine** | `inference.events` | `inference_errors` | Filters for `status = error` events only. Persists one row per failure with the HTTP status code, classified error type, raw message, and serialised error details for debugging. |

## Building

```bash
pnpm build
```
