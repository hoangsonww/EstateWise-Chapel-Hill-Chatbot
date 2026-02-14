import { z } from "zod";
import { config } from "../core/config.js";
import type { ToolDef } from "../core/registry.js";

class RpcError extends Error {
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);
  }
}

type RpcResponse = {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

function normalizeAgentUrl(agentUrl?: string) {
  const raw = agentUrl?.trim() || config.a2aBaseUrl;
  if (!raw) throw new Error("Missing A2A base URL");
  return raw.replace(/\/$/, "");
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs = config.a2aTimeoutMs,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(500, timeoutMs));
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let json: unknown = {};
    if (text.length > 0) {
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(`Invalid JSON response from ${url}`);
      }
    }
    if (!res.ok) {
      const msg = (json as any)?.error?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json;
  } catch (error) {
    if ((error as any)?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function getAgentCard(agentUrl?: string) {
  const baseUrl = normalizeAgentUrl(agentUrl);
  return await fetchJson(`${baseUrl}/.well-known/agent-card.json`, {
    method: "GET",
  });
}

async function rpcCall(
  method: string,
  params: Record<string, unknown>,
  options?: {
    agentUrl?: string;
    timeoutMs?: number;
  },
) {
  const baseUrl = normalizeAgentUrl(options?.agentUrl);
  const payload = {
    jsonrpc: "2.0" as const,
    id: `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    method,
    params,
  };
  const response = (await fetchJson(
    `${baseUrl}/a2a`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    options?.timeoutMs ?? config.a2aTimeoutMs,
  )) as RpcResponse;

  if (response.error) {
    throw new RpcError(response.error.message, response.error.code);
  }
  return response.result;
}

function isTerminalTask(task: any): boolean {
  const status = task?.status;
  return status === "succeeded" || status === "failed" || status === "canceled";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTask(
  taskId: string,
  options?: {
    agentUrl?: string;
    timeoutMs?: number;
    pollMs?: number;
  },
) {
  const timeoutMs = Math.max(
    1_000,
    options?.timeoutMs ?? config.a2aWaitTimeoutMs,
  );
  const pollMs = Math.max(200, options?.pollMs ?? config.a2aPollMs);
  try {
    const waited = (await rpcCall(
      "tasks.wait",
      { taskId, timeoutMs },
      {
        agentUrl: options?.agentUrl,
        timeoutMs: timeoutMs + config.a2aTimeoutMs,
      },
    )) as any;
    return waited?.task ?? waited;
  } catch (error) {
    if (!(error instanceof RpcError) || error.code !== -32601) throw error;

    // Fallback for A2A servers that do not implement tasks.wait.
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const current = (await rpcCall("tasks.get", { taskId }, options)) as any;
      const task = current?.task ?? current;
      if (isTerminalTask(task)) return task;
      await sleep(pollMs);
    }
    throw new Error(`Timed out waiting for task ${taskId}`);
  }
}

/** A2A bridge tools for orchestrating remote Agentic AI peers from MCP clients. */
export const a2aTools: ToolDef[] = [
  {
    name: "a2a.agentCard",
    description:
      "Fetch A2A agent metadata card from an Agentic AI server (defaults to A2A_BASE_URL).",
    schema: { agentUrl: z.string().url().optional() },
    handler: async (args: any) => {
      const { agentUrl } = args as { agentUrl?: string };
      const card = await getAgentCard(agentUrl);
      return { content: [{ type: "text", text: JSON.stringify(card) }] };
    },
  },
  {
    name: "a2a.task.create",
    description:
      "Create a remote A2A task with a goal. Optionally wait for completion.",
    schema: {
      goal: z.string(),
      runtime: z.enum(["default", "langgraph", "crewai"]).optional(),
      rounds: z.number().int().min(1).max(20).optional(),
      threadId: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
      waitForCompletion: z.boolean().default(false),
      timeoutMs: z.number().int().positive().optional(),
      pollMs: z.number().int().positive().optional(),
      agentUrl: z.string().url().optional(),
    },
    handler: async (args: any) => {
      const {
        goal,
        runtime,
        rounds,
        threadId,
        metadata,
        waitForCompletion = false,
        timeoutMs,
        pollMs,
        agentUrl,
      } = args as {
        goal: string;
        runtime?: "default" | "langgraph" | "crewai";
        rounds?: number;
        threadId?: string;
        metadata?: Record<string, unknown>;
        waitForCompletion?: boolean;
        timeoutMs?: number;
        pollMs?: number;
        agentUrl?: string;
      };

      const created = (await rpcCall(
        "tasks.create",
        { goal, runtime, rounds, threadId, metadata },
        { agentUrl, timeoutMs },
      )) as any;
      const initialTask = created?.task ?? created;

      if (!waitForCompletion) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ task: initialTask }),
            },
          ],
        };
      }

      const taskId =
        typeof initialTask?.id === "string" ? initialTask.id : undefined;
      if (!taskId) {
        throw new Error("tasks.create response did not include a task id");
      }
      const finalTask = await waitForTask(taskId, {
        agentUrl,
        timeoutMs,
        pollMs,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ task: finalTask, initialTask }),
          },
        ],
      };
    },
  },
  {
    name: "a2a.task.get",
    description: "Get a remote A2A task by id.",
    schema: {
      taskId: z.string(),
      agentUrl: z.string().url().optional(),
      timeoutMs: z.number().int().positive().optional(),
    },
    handler: async (args: any) => {
      const { taskId, agentUrl, timeoutMs } = args as {
        taskId: string;
        agentUrl?: string;
        timeoutMs?: number;
      };
      const data = await rpcCall(
        "tasks.get",
        { taskId },
        { agentUrl, timeoutMs },
      );
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "a2a.task.wait",
    description: "Wait until a remote A2A task reaches a terminal status.",
    schema: {
      taskId: z.string(),
      timeoutMs: z.number().int().positive().optional(),
      pollMs: z.number().int().positive().optional(),
      agentUrl: z.string().url().optional(),
    },
    handler: async (args: any) => {
      const { taskId, timeoutMs, pollMs, agentUrl } = args as {
        taskId: string;
        timeoutMs?: number;
        pollMs?: number;
        agentUrl?: string;
      };
      const task = await waitForTask(taskId, {
        timeoutMs,
        pollMs,
        agentUrl,
      });
      return { content: [{ type: "text", text: JSON.stringify({ task }) }] };
    },
  },
  {
    name: "a2a.task.cancel",
    description: "Cancel a remote A2A task.",
    schema: {
      taskId: z.string(),
      agentUrl: z.string().url().optional(),
      timeoutMs: z.number().int().positive().optional(),
    },
    handler: async (args: any) => {
      const { taskId, agentUrl, timeoutMs } = args as {
        taskId: string;
        agentUrl?: string;
        timeoutMs?: number;
      };
      const data = await rpcCall(
        "tasks.cancel",
        { taskId },
        { agentUrl, timeoutMs },
      );
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "a2a.task.list",
    description: "List recent remote A2A tasks.",
    schema: {
      limit: z.number().int().min(1).max(200).optional(),
      agentUrl: z.string().url().optional(),
      timeoutMs: z.number().int().positive().optional(),
    },
    handler: async (args: any) => {
      const {
        limit = 20,
        agentUrl,
        timeoutMs,
      } = args as {
        limit?: number;
        agentUrl?: string;
        timeoutMs?: number;
      };
      const data = await rpcCall(
        "tasks.list",
        { limit },
        { agentUrl, timeoutMs },
      );
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];
