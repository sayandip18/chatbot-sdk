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

## Building

```bash
pnpm build
```
