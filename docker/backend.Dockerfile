# syntax=docker/dockerfile:1.6
FROM node:20-slim AS builder

WORKDIR /app/backend

# Install deps for build
COPY backend/package*.json backend/tsconfig.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Build sources
COPY backend/src ./src
COPY backend/public ./public
RUN npm run build

FROM node:20-slim AS runner

ENV NODE_ENV=production
ENV PORT=3001
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl dumb-init \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Install only production deps
COPY backend/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy build output
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/public ./public

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3001/metrics || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
