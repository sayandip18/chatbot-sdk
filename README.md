Chatbot Insight Extractor

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/) 10+ (for local frontend development)

## Setup

Copy the environment file and fill in your API keys:

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

### Using Docker

Build and start all services — backend, worker, Postgres, Redis, and the Nginx-served frontend:

```bash
docker compose up --build
```

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:80   |
| Backend API | http://localhost:3000 |

### Using Kubernetes (via Docker Desktop)

Requires Kubernetes enabled in Docker Desktop: **Settings → Kubernetes → Enable Kubernetes → Apply**.

**1. Fill in your API keys** in [k8s/secrets.yaml](k8s/secrets.yaml) (this file is gitignored):

```yaml
stringData:
  POSTGRES_PASSWORD: postgres
  OPENAI_API_KEY: "your-key-here"
  GEMINI_API_KEY: "your-key-here"
```

**2. Start a local registry** (required — Docker Desktop's Kubernetes uses containerd internally and cannot access images built with BuildKit directly from Docker's image store):

```bash
docker run -d -p 5000:5000 --restart=always --name local-registry registry:2
```

**3. Build and push the images to the local registry:**

```bash
docker buildx build --platform linux/amd64 --load -t chatbot-sdk-backend:latest -f apps/backend/Dockerfile .
docker buildx build --platform linux/amd64 --load -t chatbot-sdk-web:latest -f apps/web/Dockerfile .

docker tag chatbot-sdk-backend:latest localhost:5000/chatbot-sdk-backend:latest
docker tag chatbot-sdk-web:latest localhost:5000/chatbot-sdk-web:latest

docker push localhost:5000/chatbot-sdk-backend:latest
docker push localhost:5000/chatbot-sdk-web:latest
```

> The `--platform linux/amd64 --load` flags are required to produce a single-platform Docker-format image. Without them, BuildKit emits an OCI image index which containerd cannot resolve with `imagePullPolicy: Always` against a local registry.

**4. Apply all manifests:**

```bash
kubectl apply -f k8s/
```

**5. Watch pods come up:**

```bash
kubectl get pods -w
```

All five pods (`postgres`, `redis`, `backend`, `worker`, `web`) should reach `Running` status. Postgres and Redis have readiness probes, so `backend` and `worker` will not start sending traffic until those are ready.

**6. Access the frontend:**

```bash
kubectl port-forward svc/web 8080:80
```

Then open `http://localhost:8080`.

> **WSL2 NodePort limitation:** The `web` service is a NodePort on `30080`, but Docker Desktop on Windows with a WSL2 backend does not reliably forward NodePort traffic from the Windows host to the WSL2 VM. `kubectl port-forward` bypasses this entirely and is the recommended access method for local development. Re-run the command after each terminal restart.

| Service     | URL                                          |
| ----------- | -------------------------------------------- |
| Frontend    | http://localhost:8080 (via `port-forward`)   |
| Backend API | via ClusterIP (internal)                     |

**Updating after a code change:**

```bash
# Rebuild and push to local registry
docker buildx build --platform linux/amd64 --load -t chatbot-sdk-backend:latest -f apps/backend/Dockerfile .
docker tag chatbot-sdk-backend:latest localhost:5000/chatbot-sdk-backend:latest
docker push localhost:5000/chatbot-sdk-backend:latest

# Roll out the new image
kubectl rollout restart deployment/backend
kubectl rollout restart deployment/worker
```

**Tear down:**

```bash
kubectl delete -f k8s/
```

> **Note:** Deleting the manifests also removes the `PersistentVolumeClaim` for Postgres, which destroys the database volume. To keep data between redeploys, omit `postgres.yaml` from the delete command or remove only the Deployment/Service objects.

| Service     | URL                   |
| ----------- | --------------------- |
| Frontend    | http://localhost:5173 |
| Backend API | http://localhost:3000 |

The Vite dev server proxies `/api` requests to `http://localhost:3000`, so no extra configuration is needed.

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

| Worker                 | Stream             | Output table               | Behaviour                                                                                                                                                                                                          |
| ---------------------- | ------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PII Redactor**       | `log.received`     | `messages`                 | Masks emails, phone numbers, card numbers, and SSNs in assistant content, then marks the message `completed`.                                                                                                      |
| **Metrics Aggregator** | `inference.events` | `inference_metrics_rollup` | Accumulates all events into in-memory 1-minute buckets per provider. Flushes sealed buckets every 60 s with pre-computed P50/P90/P99 latency percentiles via an upsert on `(bucket_timestamptz, provider, model)`. |
| **Insight Engine**     | `inference.events` | `inference_errors`         | Filters for `status = error` events only. Persists one row per failure with the HTTP status code, classified error type, raw message, and serialised error details for debugging.                                  |
