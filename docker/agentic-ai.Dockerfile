# syntax=docker/dockerfile:1.6
FROM node:20-slim AS build

WORKDIR /workspace

# MCP sources
COPY mcp/package*.json ./mcp/
COPY mcp/tsconfig.json ./mcp/
COPY mcp/src ./mcp/src

# Agentic AI sources
COPY agentic-ai/package*.json ./agentic-ai/
COPY agentic-ai/tsconfig.json ./agentic-ai/
COPY agentic-ai/src ./agentic-ai/src
COPY agentic-ai/tests ./agentic-ai/tests
COPY agentic-ai/crewai ./agentic-ai/crewai
COPY agentic-ai/public ./agentic-ai/public

# Build MCP
RUN --mount=type=cache,target=/root/.npm npm ci --prefix mcp
RUN npm run build --prefix mcp

# Build Agentic AI
RUN --mount=type=cache,target=/root/.npm npm ci --prefix agentic-ai
RUN npm run build --prefix agentic-ai

FROM node:20-slim AS runner

ENV NODE_ENV=production
ENV PORT=4318
ENV MCP_SERVER_PATH=/app/mcp/dist/server.js
ENV AGENTIC_HOME=/app/agentic-ai
ENV PATH="/opt/crewai/bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv python3-pip curl dumb-init \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m venv /opt/crewai \
  && /opt/crewai/bin/pip install --upgrade pip

WORKDIR /app

# Install runtime deps only
COPY mcp/package*.json ./mcp/
COPY agentic-ai/package*.json ./agentic-ai/
RUN --mount=type=cache,target=/root/.npm npm ci --prefix mcp --omit=dev \
  && npm ci --prefix agentic-ai --omit=dev

# Copy build outputs
COPY --from=build /workspace/mcp/dist ./mcp/dist
COPY --from=build /workspace/agentic-ai/dist ./agentic-ai/dist
COPY --from=build /workspace/agentic-ai/public ./agentic-ai/public
COPY --from=build /workspace/agentic-ai/crewai ./agentic-ai/crewai

# Python deps for CrewAI runtime
RUN /opt/crewai/bin/pip install -r /app/agentic-ai/crewai/requirements.txt

# Non-root user
RUN useradd -ms /bin/bash estatewise \
  && chown -R estatewise:estatewise /app /opt/crewai
USER estatewise

EXPOSE 4318

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:4318/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/http/server.js"]
