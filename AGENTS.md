# Autonomous Agents / Task Delegation Plan

This document outlines the systematic breakdown of tasks for the Lightweight LLM Inference Logging and Ingestion System. The tasks are categorized by domain to facilitate parallel development or delegation to specialized roles (or autonomous agents).

## 1. Database & Infrastructure Agent

**Focus:** Schema design, data persistence, and initial containerization.

- **Task 1.1:** Design a normalized PostgreSQL database schema.
  - `conversations` table (id, user_id, status, created_at, updated_at).
  - `messages` table (id, conversation_id, role, content, created_at).
  - `inference_logs` table (id, message_id, model, provider, latency_ms, prompt_tokens, completion_tokens, status, error_message, timestamp).
- **Task 1.2:** Implement database migrations and seed data setup.
- **Task 1.3:** Create the foundational `docker-compose.yml` to spin up PostgreSQL and pgAdmin/Redis (if using an event broker).

## 2. Backend & Ingestion Agent (Node.js / NestJS)

**Focus:** Core API, LLM proxy, and telemetry ingestion pipeline.

- **Task 2.1: API Setup:** Initialize a RESTful API service to handle frontend requests and SDK payloads.
- **Task 2.2: Chat Endpoints:** Implement endpoints to list, resume, and cancel conversations.
- **Task 2.3: Ingestion Pipeline:** \* Create a robust endpoint (`POST /v1/ingest/logs`) to receive telemetry.
  - Implement payload validation (e.g., using Zod or class-validator).
  - Extract metadata and insert records into the `inference_logs` table.
- **Task 2.4: Event-Based Architecture (Bonus):** Set up a message queue (RabbitMQ or Kafka) or basic Pub/Sub to decouple the ingestion endpoint from direct database writes, ensuring high throughput.

## 3. SDK / Wrapper Agent (TypeScript)

**Focus:** Creating the plug-and-play middleware for LLM calls.

- **Task 3.1: Core Wrapper logic:** Create a TypeScript class/function wrapper around foundation model APIs (e.g., OpenAI SDK, Anthropic SDK).
- **Task 3.2: Multi-Provider Support:** Implement adapter patterns to support multiple models (GPT-4o, Claude 3.5 Sonnet, Gemini).
- **Task 3.3: Metadata Extraction:** Automatically calculate latency (start/end time), parse token usage from the LLM response, and capture the current conversation ID.
- **Task 3.4: Asynchronous Dispatch:** Ensure the wrapper sends telemetry to the Ingestion API asynchronously without blocking the main thread or delaying the LLM response delivery to the client.
- **Task 3.5: PII Redaction (Bonus):** Implement a pre-processing step in the SDK (using regex or a fast NLP library) to mask sensitive data before it hits the ingestion service.

## 4. Frontend Chatbot Agent (React)

**Focus:** User interface and conversational experience.

- **Task 4.1: Layout & State Management:** Build a clean UI with a sidebar for listing previous conversations and a main chat window.
- **Task 4.2: Chat Functionality:** Implement the multi-turn chat interface. Send user input to the backend and append responses.
- **Task 4.3: Streaming (Bonus):** Implement Server-Sent Events (SSE) or WebSockets to handle streaming responses from the LLM.
- **Task 4.4: Conversation Controls:** Add UI buttons to "New Chat", "Cancel" (abort ongoing stream/request), and click historical chats to "Resume".

## 5. DevOps & Observability Agent

**Focus:** Deployment, scaling, and monitoring dashboards.

- **Task 5.1: Dockerization:** Write a `Dockerfile` for the Frontend, Backend, and SDK (if published as a microservice test). Update the root `docker-compose.yml` for a one-command setup (`docker-compose up --build`).
- **Task 5.2: Dashboards (Bonus):** Set up Grafana (connected to PostgreSQL or Prometheus) to visualize Latency, Throughput, and Error rates from the `inference_logs` table.
- **Task 5.3: Kubernetes (Bonus):** Write Helm charts or standard k8s manifests (`Deployment`, `Service`, `Ingress`) to deploy the application on a local cluster (e.g., Minikube).

## 6. Documentation Agent

**Focus:** Deliverables and submission packaging.

- **Task 6.1:** Write the comprehensive `README.md` containing setup instructions and architecture notes.
- **Task 6.2:** Document schema design decisions, focusing on indexing strategies for fast telemetry queries.

## 7. Architecture

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
[Ingestion API] ──(Write)──> [Insights DB]
       │
       │ (Publish Event: "log.received")
       ▼
 ┌───────────────┐
 │  Message Bus  │ (Redis Streams)
 └───────┬───────┘
         │
         ├───────────────────────────────┬──────────────────────────────┐
         ▼                               ▼                              ▼
 ┌───────────────┐               ┌───────────────┐              ┌───────────────┐
 │ PII Redactor  │               │ Metrics Agg.  │              │ Insight Engine│
 └───────┬───────┘               └───────┬───────┘              └───────┬───────┘
         │ (Masks Data)                  │ (Increments Counters)        │ (Async LLM/Eval)
         ▼                               ▼                              ▼
┌─────────────────┐             ┌─────────────────┐            ┌─────────────────┐
│  Messages DB    │             │  TimeSeries DB  │            │  Analytics DB   │
└─────────────────┘             └─────────────────┘            └─────────────────┘
```
