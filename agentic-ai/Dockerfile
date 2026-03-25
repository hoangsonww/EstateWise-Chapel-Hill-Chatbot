# syntax=docker/dockerfile:1.6

FROM node:20-bullseye AS build
WORKDIR /workspace

# Copy MCP project
COPY mcp/package*.json ./mcp/
COPY mcp/tsconfig.json ./mcp/
COPY mcp/src ./mcp/src
COPY mcp/shared ./mcp/shared
COPY mcp/servers ./mcp/servers
COPY mcp/client ./mcp/client
COPY mcp/config ./mcp/config

# Copy Agentic AI project
COPY agentic-ai/package*.json ./agentic-ai/
COPY agentic-ai/tsconfig.json ./agentic-ai/
COPY agentic-ai/src ./agentic-ai/src
COPY agentic-ai/tests ./agentic-ai/tests
COPY agentic-ai/crewai ./agentic-ai/crewai

# Install dependencies and build MCP
RUN npm ci --prefix mcp
RUN npm run build --prefix mcp

# Install dependencies and build Agentic AI
RUN npm ci --prefix agentic-ai
RUN npm run build --prefix agentic-ai

FROM node:20-bullseye
WORKDIR /app
ENV NODE_ENV=production

# Install runtime dependencies
COPY agentic-ai/package*.json ./agentic-ai/
COPY mcp/package*.json ./mcp/
RUN npm ci --prefix mcp --omit=dev && npm ci --prefix agentic-ai --omit=dev

# Copy build outputs
COPY --from=build /workspace/mcp/dist ./mcp/dist
COPY --from=build /workspace/agentic-ai/dist ./agentic-ai/dist
COPY mcp/shared ./mcp/shared
COPY mcp/servers ./mcp/servers
COPY mcp/client ./mcp/client
COPY mcp/config ./mcp/config
COPY agentic-ai/crewai ./agentic-ai/crewai

# Python runtime for CrewAI
RUN apt-get update && apt-get install -y python3 python3-venv python3-pip && rm -rf /var/lib/apt/lists/* \
 && python3 -m venv /opt/crewai \
 && /opt/crewai/bin/pip install --upgrade pip \
 && /opt/crewai/bin/pip install -r agentic-ai/crewai/requirements.txt

ENV PATH="/opt/crewai/bin:${PATH}"
ENV MCP_SERVER_PATH=/app/mcp/dist/server.js
ENV AGENTIC_HOME=/app/agentic-ai
ENV ANTHROPIC_API_KEY=""
ENV DAILY_BUDGET_USD=10
ENV MONTHLY_BUDGET_USD=200
ENV PER_REQUEST_MAX_USD=0.50
ENV DEFAULT_AGENT_TIMEOUT_MS=60000
ENV MAX_AGENT_ITERATIONS=10
ENV MAX_CONCURRENT_AGENTS=3
WORKDIR /app/agentic-ai

# Non-root user
RUN useradd -ms /bin/bash estatewise
RUN chown -R estatewise:estatewise /app /opt/crewai
USER estatewise

ENTRYPOINT ["node", "dist/index.js"]
