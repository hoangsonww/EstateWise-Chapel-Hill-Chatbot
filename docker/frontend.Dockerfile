# syntax=docker/dockerfile:1.6
FROM node:20-slim AS builder

ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app/frontend

# Install deps for build
COPY frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Build sources
COPY frontend/ ./
RUN npm run build

FROM node:20-slim AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl dumb-init \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/frontend

# Install only production deps
COPY frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# Copy build output and public assets
COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/next.config.ts ./next.config.ts

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/ || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
