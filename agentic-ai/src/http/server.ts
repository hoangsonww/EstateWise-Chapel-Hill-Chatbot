import http from "node:http";
import { URL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PlannerAgent } from "../agents/PlannerAgent.js";
import { GraphAnalystAgent } from "../agents/GraphAnalystAgent.js";
import { PropertyAnalystAgent } from "../agents/PropertyAnalystAgent.js";
import { MapAnalystAgent } from "../agents/MapAnalystAgent.js";
import { ReporterAgent } from "../agents/ReporterAgent.js";
import { FinanceAnalystAgent } from "../agents/FinanceAnalystAgent.js";
import { ZpidFinderAgent } from "../agents/ZpidFinderAgent.js";
import { AnalyticsAnalystAgent } from "../agents/AnalyticsAnalystAgent.js";
import { CoordinatorAgent } from "../agents/CoordinatorAgent.js";
import { DedupeRankingAgent } from "../agents/DedupeRankingAgent.js";
import { ComplianceAgent } from "../agents/ComplianceAgent.js";
import { AgentOrchestrator } from "../orchestrator/AgentOrchestrator.js";
import { runEstateWiseAgent } from "../lang/graph.js";
import { runCrewAIGoal } from "../crewai/CrewRunner.js";
import { A2AProtocol } from "../a2a/protocol.js";
import type { AgentRuntime } from "../a2a/types.js";
import type { CostReport } from "../costs/tracker.js";
import { stopMcp } from "../lang/tools.js";
import {
  getRequiredToolsForRuntime,
  parseRequiredToolsMode,
} from "../mcp/contracts.js";
import { getLangSmithStatus, initializeLangSmith } from "../lang/langsmith.js";

/** Send a JSON response with CORS headers. */
function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(typeof body === "string" ? body : data);
}

const dashboardPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../public/costs-dashboard.html",
);
const DEFAULT_ROUNDS = 5;
const DEFAULT_PORT = 4318;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
let lastCostReport: CostReport | null = null;
const supportedRuntimes: AgentRuntime[] = ["default", "langgraph", "crewai"];

/** Parse a small JSON body into an object. */
function parseBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(Buffer.from(c)));
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        const txt = Buffer.concat(chunks).toString("utf-8");
        resolve(JSON.parse(txt));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

interface RunRequest {
  goal: string;
  runtime: AgentRuntime;
  rounds: number;
  threadId?: string;
  source?: "http" | "http-stream" | "a2a";
  requestId?: string;
}

function parseRuntime(runtime: unknown): AgentRuntime {
  if (runtime == null || runtime === "") return "default";
  if (
    runtime === "default" ||
    runtime === "langgraph" ||
    runtime === "crewai"
  ) {
    return runtime;
  }
  throw new Error("runtime must be one of default|langgraph|crewai");
}

function parseRounds(rounds: unknown, fallback = 5): number {
  const n = Number(rounds ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.floor(n);
  if (rounded < 1) return fallback;
  return Math.min(rounded, 20);
}

function parseRunRequest(body: any): RunRequest {
  const goal = typeof body?.goal === "string" ? body.goal.trim() : "";
  if (!goal) throw new Error("Missing goal");
  const runtime = parseRuntime(body?.runtime);
  const rounds = parseRounds(body?.rounds, 5);
  const threadId =
    typeof body?.threadId === "string" && body.threadId.length > 0
      ? body.threadId
      : process.env.THREAD_ID;
  return { goal, runtime, rounds, threadId };
}

function parseRequestId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 128);
}

function createDefaultOrchestrator() {
  return new AgentOrchestrator().register(
    new PlannerAgent(),
    new CoordinatorAgent(),
    new ZpidFinderAgent(),
    new PropertyAnalystAgent(),
    new AnalyticsAnalystAgent(),
    new GraphAnalystAgent(),
    new DedupeRankingAgent(),
    new MapAnalystAgent(),
    new FinanceAnalystAgent(),
    new ComplianceAgent(),
    new ReporterAgent(),
  );
}

async function executeRun(req: RunRequest) {
  const startedAt = Date.now();
  if (req.runtime === "langgraph") {
    const result = await runEstateWiseAgent({
      input: req.goal,
      threadId: req.threadId,
      trace: {
        runtime: "langgraph",
        surface: req.source || "http",
        component: "http-server",
        requestId: req.requestId,
      },
    });
    lastCostReport = result.costs ?? null;
    return {
      runtime: req.runtime,
      goal: req.goal,
      result,
      durationMs: Date.now() - startedAt,
    };
  }
  if (req.runtime === "crewai") {
    const result = await runCrewAIGoal(req.goal);
    lastCostReport = result.costs ?? null;
    return {
      runtime: req.runtime,
      goal: req.goal,
      result,
      durationMs: Date.now() - startedAt,
    };
  }

  lastCostReport = null;
  const orchestrator = createDefaultOrchestrator();
  const messages = await orchestrator.run(req.goal, req.rounds);
  return {
    runtime: "default" as const,
    goal: req.goal,
    messages,
    durationMs: Date.now() - startedAt,
  };
}

function toEnvInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function createA2AProtocol(): A2AProtocol {
  return new A2AProtocol(
    async (input) =>
      await executeRun({
        goal: input.goal,
        runtime: input.runtime,
        rounds: input.rounds,
        threadId: input.threadId,
        requestId: input.requestId,
        source: "a2a",
      }),
    {
      defaultRounds: DEFAULT_ROUNDS,
      maxTasks: toEnvInt("A2A_MAX_TASKS", 500),
      retentionMs: toEnvInt("A2A_TASK_RETENTION_MS", 24 * 60 * 60_000),
      defaultWaitTimeoutMs: toEnvInt("A2A_WAIT_TIMEOUT_MS", 120_000),
    },
  );
}

/** Execute a run in batch mode and return a JSON payload. */
async function handleRun(body: any) {
  try {
    const req = parseRunRequest(body);
    const requestId =
      parseRequestId(body?.requestId) ||
      parseRequestId(body?.traceId) ||
      randomUUID();
    const result = await executeRun({
      ...req,
      source: "http",
      requestId,
    });
    return { status: 200, json: result };
  } catch (e: any) {
    const message = e?.message || String(e);
    const status = /missing goal|runtime must/.test(message.toLowerCase())
      ? 400
      : 500;
    return { status, json: { error: message } };
  }
}

function isMainModule() {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function registerGracefulShutdown(server: http.Server) {
  let closing = false;
  const shutdown = (signal: string) => {
    if (closing) return;
    closing = true;
    // eslint-disable-next-line no-console
    console.log(`[agentic-ai] Received ${signal}; draining HTTP server...`);
    const forceTimer = setTimeout(() => {
      // eslint-disable-next-line no-console
      console.error("[agentic-ai] Forced shutdown after timeout.");
      process.exit(1);
    }, DEFAULT_SHUTDOWN_TIMEOUT_MS);
    forceTimer.unref();
    server.close((error) => {
      clearTimeout(forceTimer);
      if (error) {
        // eslint-disable-next-line no-console
        console.error("[agentic-ai] HTTP shutdown failed:", error.message);
        process.exit(1);
        return;
      }
      void stopMcp().finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

function resolveBaseUrl(req: http.IncomingMessage, fallbackUrl: URL): string {
  const protoHeader = req.headers["x-forwarded-proto"];
  const hostHeader = req.headers["x-forwarded-host"] ?? req.headers.host;
  const proto =
    typeof protoHeader === "string" && protoHeader.length > 0
      ? protoHeader.split(",")[0].trim()
      : fallbackUrl.protocol.replace(":", "");
  const host =
    typeof hostHeader === "string" && hostHeader.length > 0
      ? hostHeader.split(",")[0].trim()
      : fallbackUrl.host;
  return `${proto}://${host}`;
}

/**
 * Minimal HTTP server for integrating Agentic AI with external clients.
 * Endpoints:
 * - GET /health
 * - GET /config
 * - GET /.well-known/agent-card.json
 * - GET /a2a/agent-card
 * - POST /a2a (JSON-RPC)
 * - GET /a2a/tasks/:taskId/events (SSE)
 * - POST /run { goal, runtime?, rounds?, threadId?, requestId? }
 * - GET /run/stream?goal=...&runtime=default|langgraph|crewai&rounds=5&threadId=...&requestId=...
 */
export function createAgenticHttpServer(): http.Server {
  const a2a = createA2AProtocol();
  return http.createServer(async (req, res) => {
    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      });
      res.end();
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const baseUrl = resolveBaseUrl(req, url);
    if (
      req.method === "GET" &&
      (url.pathname === "/.well-known/agent-card.json" ||
        url.pathname === "/a2a/agent-card")
    ) {
      return sendJson(res, 200, a2a.getAgentCard(baseUrl));
    }
    if (req.method === "POST" && url.pathname === "/a2a") {
      let body: any = {};
      try {
        body = await parseBody(req);
      } catch {
        return sendJson(res, 400, {
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error" },
        });
      }

      try {
        const rpcResponse = await a2a.handleRpc(body, baseUrl);
        if (!rpcResponse) {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          });
          res.end();
          return;
        }
        return sendJson(res, 200, rpcResponse as any);
      } catch (err: any) {
        return sendJson(res, 500, {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32000,
            message: err?.message || "A2A request failed",
          },
        });
      }
    }
    if (
      req.method === "GET" &&
      url.pathname.startsWith("/a2a/tasks/") &&
      url.pathname.endsWith("/events")
    ) {
      const prefix = "/a2a/tasks/";
      const suffix = "/events";
      const encodedTaskId = url.pathname.slice(
        prefix.length,
        url.pathname.length - suffix.length,
      );
      const taskId = decodeURIComponent(encodedTaskId);
      if (!taskId) return sendJson(res, 400, { error: "Missing taskId" });
      const ok = a2a.streamTaskEvents(taskId, res);
      if (!ok) return sendJson(res, 404, { error: "Task not found" });
      return;
    }
    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, { ok: true });
    }
    if (req.method === "GET" && url.pathname === "/costs/latest") {
      if (!lastCostReport) {
        return sendJson(res, 404, { error: "No cost data available" });
      }
      return sendJson(res, 200, lastCostReport);
    }
    if (req.method === "GET" && url.pathname === "/costs/dashboard") {
      try {
        const html = await fs.readFile(dashboardPath, "utf-8");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      } catch (err: any) {
        return sendJson(res, 500, {
          error: err?.message || "Failed to load dashboard",
        });
      }
    }
    if (req.method === "GET" && url.pathname === "/config") {
      const langsmith = getLangSmithStatus();
      return sendJson(res, 200, {
        runtimes: supportedRuntimes,
        protocols: ["http", "a2a", "mcp"],
        defaultRounds: DEFAULT_ROUNDS,
        mcp: {
          requiredToolsMode: parseRequiredToolsMode(
            process.env.MCP_REQUIRED_TOOLS_MODE,
          ),
          requiredTools: {
            default: getRequiredToolsForRuntime("default"),
            langgraph: getRequiredToolsForRuntime("langgraph"),
          },
        },
        a2a: {
          card: `${baseUrl}/.well-known/agent-card.json`,
          rpc: `${baseUrl}/a2a`,
          taskEvents: `${baseUrl}/a2a/tasks/{taskId}/events`,
        },
        langsmith: {
          enabled: langsmith.enabled && !langsmith.misconfigured,
          project: langsmith.project,
          endpoint: langsmith.endpoint || null,
          strict: langsmith.strict,
        },
      });
    }
    if (req.method === "GET" && url.pathname === "/run/stream") {
      // SSE streaming of progress
      const goal = String(url.searchParams.get("goal") || "");
      let runtime: AgentRuntime;
      try {
        runtime = parseRuntime(url.searchParams.get("runtime") || "default");
      } catch (err: any) {
        res.writeHead(400, {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: err?.message || "Invalid runtime" }));
        return;
      }
      const rounds = parseRounds(url.searchParams.get("rounds") || 5, 5);
      const threadId =
        url.searchParams.get("threadId") || process.env.THREAD_ID;
      const requestId =
        parseRequestId(req.headers["x-request-id"]?.toString()) ||
        parseRequestId(url.searchParams.get("requestId")) ||
        randomUUID();
      if (!goal) {
        res.writeHead(400, {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        });
        res.end(JSON.stringify({ error: "Missing goal" }));
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      const send = (obj: any) => {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
      };
      const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 15000);

      try {
        if (runtime === "langgraph") {
          send({ type: "start", runtime, goal, rounds });
          const result = await runEstateWiseAgent({
            input: goal,
            threadId: threadId || undefined,
            trace: {
              runtime: "langgraph",
              surface: "http-stream",
              component: "http-server",
              requestId,
            },
          });
          lastCostReport = result.costs ?? null;
          for (const msg of result.messages) {
            send({
              type: "message",
              message: {
                from: msg.name ? `${msg.role}:${msg.name}` : msg.role,
                content: msg.content,
              },
            });
          }
          if (result.toolExecutions.length > 0) {
            send({
              type: "tools",
              tools: result.toolExecutions.map((tool) => ({
                id: tool.callId,
                name: tool.name,
                status: tool.status,
                durationMs: tool.durationMs,
                output: tool.error ?? tool.output,
              })),
            });
          }
          send({ type: "final", message: result.finalMessage });
          if (result.costs) {
            send({ type: "costs", costs: result.costs.summary });
          }
          send({ type: "done" });
          clearInterval(heartbeat);
          res.end();
          return;
        }
        if (runtime === "crewai") {
          send({ type: "start", runtime, goal, rounds });
          const result = await runCrewAIGoal(goal);
          lastCostReport = result.costs ?? null;
          if (result.structured) {
            send({
              type: "message",
              message: {
                from: "crewai",
                content: result.structured.summary || "",
              },
            });
            for (const entry of result.structured.timeline) {
              send({
                type: "message",
                message: {
                  from: `crewai:${entry.agent}`,
                  content: `${entry.task}: ${entry.output}`,
                },
              });
            }
          } else {
            send({
              type: "message",
              message: {
                from: "crewai",
                content: result.output || JSON.stringify(result),
              },
            });
          }
          if (result.costs) {
            send({ type: "costs", costs: result.costs.summary });
          }
          send({ type: "done" });
          clearInterval(heartbeat);
          res.end();
          return;
        }

        // default orchestrator
        const orchestrator = createDefaultOrchestrator();
        await orchestrator.runStream(goal, rounds, (e) => send(e));
        clearInterval(heartbeat);
        res.end();
        return;
      } catch (e: any) {
        send({ type: "error", error: e?.message || String(e) });
        clearInterval(heartbeat);
        res.end();
        return;
      }
    }
    if (req.method === "POST" && url.pathname === "/run") {
      let body: any = {};
      try {
        body = await parseBody(req);
      } catch (e: any) {
        return sendJson(res, 400, { error: "Invalid JSON body" });
      }
      const out = await handleRun({
        ...body,
        requestId:
          parseRequestId(req.headers["x-request-id"]?.toString()) ||
          parseRequestId(body?.requestId) ||
          undefined,
      });
      return sendJson(res, out.status, out.json as any);
    }

    sendJson(res, 404, { error: "Not found" });
  });
}

export function startHttpServer(
  port = Number(process.env.PORT || DEFAULT_PORT),
) {
  initializeLangSmith({ surface: "http", runtime: "langgraph" });
  const server = createAgenticHttpServer();
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Agentic AI HTTP server listening on http://localhost:${port}`);
  });
  return server;
}

export const __httpTestUtils = {
  parseRuntime,
  parseRounds,
  parseRequestId,
};

if (isMainModule()) {
  const server = startHttpServer();
  registerGracefulShutdown(server);
}
