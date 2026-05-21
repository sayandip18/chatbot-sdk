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

## Building

```bash
pnpm build
```
