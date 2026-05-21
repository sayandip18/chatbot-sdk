FROM node:20-alpine AS base
RUN npm install -g pnpm@10.30.3

FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/
COPY apps/types/package.json ./apps/types/

RUN pnpm install --frozen-lockfile

COPY apps/backend ./apps/backend
COPY apps/types ./apps/types

RUN pnpm --filter backend build && \
    pnpm --filter backend deploy --prod /app/deploy

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/deploy .

EXPOSE 3000
CMD ["node", "dist/main"]
