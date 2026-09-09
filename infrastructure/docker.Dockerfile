FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/core/package.json packages/core/package.json
COPY prisma prisma
RUN pnpm install --frozen-lockfile
FROM dependencies AS development
COPY . .
RUN pnpm db:generate
FROM development AS api
RUN pnpm --filter @aing/api build
ENV NODE_ENV=production
USER node
CMD ["node","apps/api/dist/apps/api/src/main.js"]
FROM development AS web-build
RUN pnpm --filter @aing/web build
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY --from=web-build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build --chown=node:node /app/apps/web/public ./apps/web/public
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
USER node
CMD ["node","apps/web/server.js"]
FROM development AS worker
RUN pnpm --filter @aing/api build
ENV NODE_ENV=production
USER node
CMD ["node","apps/api/dist/workers/scoring-worker/index.js"]
