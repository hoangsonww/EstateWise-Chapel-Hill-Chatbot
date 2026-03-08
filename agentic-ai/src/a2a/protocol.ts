import type http from "node:http";
import { A2ATaskStore } from "./taskStore.js";
import type {
  A2AAgentCard,
  A2ATaskInput,
  AgentRuntime,
  JsonRpcRequest,
  JsonRpcResponse,
} from "./types.js";

interface A2AProtocolOptions {
  defaultRounds?: number;
  maxTasks?: number;
  retentionMs?: number;
  defaultWaitTimeoutMs?: number;
}

interface CreateTaskParams {
  goal: string;
  runtime?: AgentRuntime;
  rounds?: number;
  threadId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

interface NormalizedCreateTaskParams {
  goal: string;
  runtime: AgentRuntime;
  rounds: number;
  threadId?: string;
  requestId?: string;
  metadata: Record<string, unknown>;
}

export class A2AProtocol {
  private readonly taskStore: A2ATaskStore;
  private readonly defaultRounds: number;
  private readonly defaultWaitTimeoutMs: number;

  constructor(
    runTask: (input: A2ATaskInput) => Promise<unknown>,
    options: A2AProtocolOptions = {},
  ) {
    this.defaultRounds = Math.max(1, options.defaultRounds ?? 5);
    this.defaultWaitTimeoutMs = Math.max(
      1_000,
      options.defaultWaitTimeoutMs ?? 120_000,
    );
    this.taskStore = new A2ATaskStore(runTask, {
      maxTasks: options.maxTasks ?? 500,
      retentionMs: options.retentionMs ?? 24 * 60 * 60_000,
    });
  }

  getAgentCard(baseUrl: string): A2AAgentCard {
    const root = baseUrl.replace(/\/$/, "");
    return {
      protocol: "a2a",
      version: "0.1",
      id: "estatewise-agentic-ai",
      name: "EstateWise Agentic AI",
      description:
        "Multi-runtime real estate research agent supporting default orchestrator, LangGraph, and CrewAI runtimes.",
      url: root,
      endpoints: {
        rpc: `${root}/a2a`,
        card: `${root}/.well-known/agent-card.json`,
        taskEvents: `${root}/a2a/tasks/{taskId}/events`,
      },
      capabilities: {
        taskManagement: true,
        streaming: true,
        runtimes: ["default", "langgraph", "crewai"],
      },
    };
  }

  async handleRpc(
    payload: unknown,
    baseUrl: string,
  ): Promise<JsonRpcResponse | null> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return rpcError(null, -32600, "Invalid Request");
    }
    const req = payload as JsonRpcRequest;
    if (req.jsonrpc !== "2.0" || typeof req.method !== "string") {
      return rpcError(req?.id ?? null, -32600, "Invalid Request");
    }

    // JSON-RPC notification: no id means no response body.
    if (req.id === undefined) {
      try {
        await this.dispatch(req.method, req.params, baseUrl);
      } catch {
        // Notifications do not receive responses.
      }
      return null;
    }

    try {
      const result = await this.dispatch(req.method, req.params, baseUrl);
      return {
        jsonrpc: "2.0",
        id: req.id ?? null,
        result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const code = (error as any)?.code ?? -32000;
      return rpcError(req.id ?? null, code, message);
    }
  }

  streamTaskEvents(taskId: string, res: http.ServerResponse): boolean {
    const task = this.taskStore.get(taskId);
    if (!task) return false;

    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    send("snapshot", task);
    const replay = this.taskStore.recentEvents(taskId, 20);
    for (const event of replay) {
      send(event.type, event);
    }

    if (isTerminal(task.status)) {
      send("done", { taskId, status: task.status });
      res.end();
      return true;
    }

    const heartbeat = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 15_000);

    const unsubscribe = this.taskStore.subscribe(taskId, (event) => {
      send(event.type, event);
      if (isTerminal(event.task.status)) {
        clearInterval(heartbeat);
        unsubscribe();
        send("done", { taskId, status: event.task.status });
        res.end();
      }
    });

    res.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    return true;
  }

  private async dispatch(method: string, params: unknown, baseUrl: string) {
    switch (method) {
      case "agent.getCard":
      case "agents.getCard":
        return this.getAgentCard(baseUrl);
      case "tasks.create":
      case "task.create":
        return this.createTask(params);
      case "tasks.get":
      case "task.get":
        return this.getTask(params);
      case "tasks.list":
      case "task.list":
        return this.listTasks(params);
      case "tasks.cancel":
      case "task.cancel":
        return this.cancelTask(params);
      case "tasks.wait":
      case "task.wait":
        return await this.waitForTask(params);
      default:
        throw makeRpcError(-32601, `Method not found: ${method}`);
    }
  }

  private createTask(params: unknown) {
    const parsed = parseCreateTaskParams(params, this.defaultRounds);
    const input: A2ATaskInput = {
      goal: parsed.goal,
      runtime: parsed.runtime,
      rounds: parsed.rounds,
      threadId: parsed.threadId,
      requestId: parsed.requestId,
    };
    const task = this.taskStore.create(input, parsed.metadata);
    return { task };
  }

  private getTask(params: unknown) {
    const taskId = parseTaskId(params);
    const task = this.taskStore.get(taskId);
    if (!task) throw makeRpcError(-32004, `Task not found: ${taskId}`);
    return { task };
  }

  private listTasks(params: unknown) {
    const limit = parseOptionalPositiveInt((params as any)?.limit, 20, 200);
    return { tasks: this.taskStore.list(limit) };
  }

  private cancelTask(params: unknown) {
    const taskId = parseTaskId(params);
    const task = this.taskStore.cancel(taskId);
    if (!task) throw makeRpcError(-32004, `Task not found: ${taskId}`);
    return { task };
  }

  private async waitForTask(params: unknown) {
    const taskId = parseTaskId(params);
    const timeoutMs = parseOptionalPositiveInt(
      (params as any)?.timeoutMs,
      this.defaultWaitTimeoutMs,
      600_000,
    );
    const task = await this.taskStore.wait(taskId, timeoutMs);
    return { task };
  }
}

function parseCreateTaskParams(
  params: unknown,
  defaultRounds: number,
): NormalizedCreateTaskParams {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw makeRpcError(-32602, "Invalid params: expected object");
  }
  const p = params as CreateTaskParams;
  if (typeof p.goal !== "string" || p.goal.trim().length === 0) {
    throw makeRpcError(-32602, "Invalid params: goal is required");
  }

  const runtime = parseRuntime(p.runtime);
  const rounds = parseOptionalPositiveInt(p.rounds, defaultRounds, 20);
  const threadId = typeof p.threadId === "string" ? p.threadId : undefined;
  const requestId = parseOptionalRequestId(p.requestId);
  const metadata = isRecord(p.metadata) ? p.metadata : {};

  return {
    goal: p.goal.trim(),
    runtime,
    rounds,
    threadId,
    requestId,
    metadata,
  };
}

function parseOptionalRequestId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 128);
}

function parseTaskId(params: unknown): string {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw makeRpcError(-32602, "Invalid params: expected object");
  }
  const taskId = (params as any).taskId;
  if (typeof taskId !== "string" || taskId.trim().length === 0) {
    throw makeRpcError(-32602, "Invalid params: taskId is required");
  }
  return taskId.trim();
}

function parseRuntime(runtime?: unknown): AgentRuntime {
  if (runtime == null) return "default";
  if (
    runtime === "default" ||
    runtime === "langgraph" ||
    runtime === "crewai"
  ) {
    return runtime;
  }
  throw makeRpcError(
    -32602,
    "Invalid params: runtime must be one of default|langgraph|crewai",
  );
}

function parseOptionalPositiveInt(
  value: unknown,
  fallback: number,
  max: number,
): number {
  if (value == null) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isTerminal(status: string): boolean {
  return status === "succeeded" || status === "failed" || status === "canceled";
}

function makeRpcError(code: number, message: string) {
  const err = new Error(message) as Error & { code?: number };
  err.code = code;
  return err;
}

function rpcError(
  id: string | number | null,
  code: number,
  message: string,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: { code, message },
  };
}
