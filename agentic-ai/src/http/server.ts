import http from "node:http";
import { URL } from "node:url";
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

/** JSON-like payload type for responses. */
type Json =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null;

/** Send a JSON response with CORS headers. */
function sendJson(res: http.ServerResponse, status: number, body: Json) {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(typeof body === "string" ? body : data);
}

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

/** Execute a run in batch mode and return a JSON payload. */
async function handleRun(body: any) {
  const goal = (body?.goal as string) || "";
  const runtime = (body?.runtime as string) || "default";
  const rounds = Number(body?.rounds ?? 5);
  const threadId = (body?.threadId as string) || process.env.THREAD_ID;
  const startedAt = Date.now();

  if (!goal || typeof goal !== "string") {
    return { status: 400, json: { error: "Missing goal" } };
  }

  try {
    if (runtime === "langgraph") {
      const result = await runEstateWiseAgent({ input: goal, threadId });
      const durationMs = Date.now() - startedAt;
      return { status: 200, json: { runtime, goal, result, durationMs } };
    }
    if (runtime === "crewai") {
      const result = await runCrewAIGoal(goal);
      const durationMs = Date.now() - startedAt;
      return { status: 200, json: { runtime, goal, result, durationMs } };
    }

    // default orchestrator
    const orchestrator = new AgentOrchestrator().register(
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
    const messages = await orchestrator.run(goal, rounds);
    const durationMs = Date.now() - startedAt;
    return {
      status: 200,
      json: { runtime: "default", goal, messages, durationMs },
    };
  } catch (e: any) {
    const durationMs = Date.now() - startedAt;
    return {
      status: 500,
      json: { error: e?.message || String(e), durationMs },
    };
  }
}

/**
 * Minimal HTTP server for integrating Agentic AI with external clients.
 * Endpoints:
 * - GET /health
 * - GET /config
 * - POST /run { goal, runtime?, rounds?, threadId? }
 * - GET /run/stream?goal=...&runtime=default|langgraph|crewai&rounds=5&threadId=...
 */
const server = http.createServer(async (req, res) => {
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
  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, { ok: true });
  }
  if (req.method === "GET" && url.pathname === "/config") {
    return sendJson(res, 200, {
      runtimes: ["default", "langgraph", "crewai"],
      defaultRounds: 5,
    });
  }
  if (req.method === "GET" && url.pathname === "/run/stream") {
    // SSE streaming of progress
    const goal = String(url.searchParams.get("goal") || "");
    const runtime = String(url.searchParams.get("runtime") || "default");
    const rounds = Number(url.searchParams.get("rounds") || 5);
    const threadId = url.searchParams.get("threadId") || process.env.THREAD_ID;
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
        });
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
      const orchestrator = new AgentOrchestrator().register(
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
    const out = await handleRun(body);
    return sendJson(res, out.status, out.json as any);
  }

  sendJson(res, 404, { error: "Not found" });
});

const port = Number(process.env.PORT || 4318);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Agentic AI HTTP server listening on http://localhost:${port}`);
});
