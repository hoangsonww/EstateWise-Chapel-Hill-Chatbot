import type { BaseMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { getCheckpointer } from "./memory.js";
import { getChatModel, type ChatModel } from "./llm.js";
import {
  CostTracker,
  withCostTracking,
  type CostReport,
} from "../costs/tracker.js";
import {
  mcpToolset,
  setToolObserver,
  startMcp,
  stopMcp,
  type LangTool,
} from "./tools.js";

const BASE_SYSTEM_PROMPT = `
You are EstateWise, a real-estate research and analysis agent.
Use tools to:
- search/lookup properties (by query or zpid),
- analyze and group results, build map links,
- query the Neo4j knowledge graph (explanations, similarities, Cypher QA),
- do mortgage/affordability calculations,
- use vector search for semantic matches.

Guidelines:
- Prefer precise, factual answers sourced via tools.
- Keep responses concise; include links (map) and key figures.
- If you need specific zpids but only have text, search first; then refine.
- Always sanity-check tool outputs. If a tool fails, try an alternative path.
`.trim();

const DEFAULT_THREAD_ID = "default";

export type LangGraphRunContext =
  | string
  | {
      [key: string]: unknown;
    };

export interface EstateWiseRuntimeConfig {
  systemPrompt?: string;
  tools?: LangTool[];
  appendTools?: LangTool[];
  checkpointer?: ReturnType<typeof getCheckpointer>;
  llm?: ChatModel;
  defaultThreadId?: string;
  defaultContext?: LangGraphRunContext;
  defaultInstructions?: string;
}

export interface LangGraphRunOptions {
  goal: string;
  threadId?: string;
  context?: LangGraphRunContext;
  additionalInstructions?: string;
  systemPrompt?: string;
  tools?: LangTool[];
  appendTools?: LangTool[];
  checkpointer?: ReturnType<typeof getCheckpointer>;
}

export interface NormalizedMessage {
  role: "user" | "assistant" | "tool" | "system" | "function";
  content: string;
  name?: string;
  raw: unknown;
}

export interface ToolExecutionRecord {
  callId: string;
  name: string;
  input: unknown;
  output?: unknown;
  error?: string;
  status: "running" | "success" | "error";
  startedAt: number;
  finishedAt: number;
  durationMs: number;
}

export interface LangGraphRunResult {
  finalMessage: string;
  messages: NormalizedMessage[];
  toolExecutions: ToolExecutionRecord[];
  metrics: {
    durationMs: number;
    toolCalls: number;
  };
  threadId: string;
  costs: CostReport;
  raw?: unknown;
}

export type RunInput = {
  input: string;
  threadId?: string;
  context?: LangGraphRunContext;
  additionalInstructions?: string;
};

export function createEstateWiseAgentGraph(config: {
  systemPrompt?: string;
  tools?: LangTool[];
  checkpointer?: ReturnType<typeof getCheckpointer>;
  llm?: ChatModel;
}) {
  const llm = config.llm ?? getChatModel();
  const tools = config.tools ?? mcpToolset();
  const checkpointer = config.checkpointer ?? getCheckpointer();
  const systemPrompt = config.systemPrompt ?? BASE_SYSTEM_PROMPT;
  const app = createReactAgent({
    llm,
    tools,
    messageModifier: systemPrompt,
    checkpointer,
  });

  return { app, tools, checkpointer, systemPrompt, llm };
}

function buildSystemPrompt(
  basePrompt: string,
  context?: LangGraphRunContext,
  extra?: string,
) {
  const sections: string[] = [basePrompt.trim()];
  const serializedCtx = serializeContext(context);
  if (serializedCtx) {
    sections.push("", "Context:", serializedCtx);
  }
  if (extra && extra.trim().length > 0) {
    sections.push("", "Additional instructions:", extra.trim());
  }
  return sections.join("\n");
}

function serializeContext(context?: LangGraphRunContext) {
  if (!context) return "";
  if (typeof context === "string") return context.trim();
  const entries = Object.entries(context)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      if (typeof value === "string") return `- ${key}: ${value.trim()}`;
      try {
        return `- ${key}: ${JSON.stringify(value)}`;
      } catch (_err) {
        return `- ${key}: ${String(value)}`;
      }
    });
  return entries.join("\n");
}

function resolveTools(...sets: Array<LangTool[] | undefined>): LangTool[] {
  const resolved: LangTool[] = [];
  for (const set of sets) {
    if (!set) continue;
    for (const tool of set) resolved.push(tool);
  }
  return resolved;
}

function normalizeMessages(messages: BaseMessage[] | undefined) {
  if (!messages || !Array.isArray(messages)) return [] as NormalizedMessage[];
  return messages.map((msg) => {
    const role = mapRole(msg);
    const content = stringifyContent((msg as any).content);
    const name = (msg as any).name as string | undefined;
    return { role, content, name, raw: msg } satisfies NormalizedMessage;
  });
}

function mapRole(msg: BaseMessage): NormalizedMessage["role"] {
  const type = (msg as any)?._getType?.();
  if (type === "ai") return "assistant";
  if (type === "human") return "user";
  if (type === "system") return "system";
  if (type === "tool") return "tool";
  if (type === "function") return "function";
  const role = (msg as any).role;
  if (role === "assistant" || role === "user" || role === "system") {
    return role;
  }
  return "assistant";
}

function stringifyContent(content: unknown): string {
  if (typeof content === "string" || typeof content === "number") {
    return String(content);
  }
  if (!content) return "";
  if (Array.isArray(content)) {
    const pieces = content
      .map((part) => {
        if (!part) return "";
        if (typeof part === "string") return part;
        if (typeof part === "number") return String(part);
        if (typeof part === "object" && "text" in part) {
          const text = (part as any).text;
          return typeof text === "string" ? text : JSON.stringify(text);
        }
        return JSON.stringify(part);
      })
      .filter(Boolean);
    return pieces.join("\n");
  }
  if (typeof content === "object" && "text" in (content as any)) {
    const text = (content as any).text;
    return typeof text === "string" ? text : JSON.stringify(text);
  }
  return JSON.stringify(content);
}

function findFinalAssistantMessage(messages: NormalizedMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === "assistant" && messages[i].content) {
      return messages[i].content;
    }
  }
  return "";
}

export const __langTestUtils = {
  buildSystemPrompt,
  serializeContext,
};

export class EstateWiseLangGraphRuntime {
  private readonly defaults: EstateWiseRuntimeConfig;

  private readonly baseCheckpointer: ReturnType<typeof getCheckpointer>;

  private readonly baseTools: LangTool[];

  private readonly baseSystemPrompt: string;

  private readonly defaultThreadId: string;

  private readonly defaultContext?: LangGraphRunContext;

  private readonly defaultInstructions?: string;

  private readonly llm: ChatModel;

  constructor(defaults: EstateWiseRuntimeConfig = {}) {
    this.defaults = defaults;
    this.baseCheckpointer = defaults.checkpointer ?? getCheckpointer();
    this.baseTools = resolveTools(
      defaults.tools ?? mcpToolset(),
      defaults.appendTools,
    );
    this.baseSystemPrompt = (
      defaults.systemPrompt ?? BASE_SYSTEM_PROMPT
    ).trim();
    this.defaultThreadId = defaults.defaultThreadId ?? DEFAULT_THREAD_ID;
    this.defaultContext = defaults.defaultContext;
    this.defaultInstructions = defaults.defaultInstructions;
    this.llm = defaults.llm ?? getChatModel();
  }

  async run(options: LangGraphRunOptions): Promise<LangGraphRunResult> {
    const costTracker = new CostTracker();
    return await withCostTracking(costTracker, async () => {
      const startedAt = Date.now();
      await startMcp();
      const toolExecutions: ToolExecutionRecord[] = [];
      setToolObserver({
        onToolStart: (event) => {
          toolExecutions.push({
            callId: event.callId,
            name: event.toolName,
            input: event.params,
            status: "running",
            output: undefined,
            error: undefined,
            startedAt: event.timestamp,
            finishedAt: event.timestamp,
            durationMs: 0,
          });
        },
        onToolSuccess: (event) => {
          const record = toolExecutions.find((t) => t.callId === event.callId);
          if (record) {
            record.status = "success";
            record.output = event.output;
            record.durationMs = event.durationMs;
            record.finishedAt = event.timestamp + event.durationMs;
          }
        },
        onToolError: (event) => {
          const record = toolExecutions.find((t) => t.callId === event.callId);
          if (record) {
            record.status = "error";
            record.error = event.error;
            record.durationMs = event.durationMs;
            record.finishedAt = event.timestamp + event.durationMs;
          }
        },
      });

      try {
        const basePrompt =
          options.systemPrompt ??
          this.defaults.systemPrompt ??
          this.baseSystemPrompt;
        const mergedContext = options.context ?? this.defaultContext;
        const mergedInstructions =
          options.additionalInstructions ?? this.defaultInstructions;
        const systemPrompt = buildSystemPrompt(
          basePrompt,
          mergedContext,
          mergedInstructions,
        );

        const tools = options.tools
          ? resolveTools(options.tools, options.appendTools)
          : resolveTools(this.baseTools, options.appendTools);

        const checkpointer = options.checkpointer ?? this.baseCheckpointer;

        const { app } = createEstateWiseAgentGraph({
          systemPrompt,
          tools,
          checkpointer,
          llm: this.llm,
        });
        const threadId = options.threadId ?? this.defaultThreadId;
        const result = await app.invoke(
          { messages: [{ role: "user", content: options.goal }] },
          {
            configurable: { thread_id: threadId },
          } as any,
        );
        const messages = normalizeMessages((result as any)?.messages);
        const finalMessage = findFinalAssistantMessage(messages);

        const finalizedExecutions = toolExecutions.map((entry) => {
          if (entry.status === "running") {
            const now = Date.now();
            return {
              ...entry,
              status: "success" as const,
              durationMs: now - entry.startedAt,
              finishedAt: now,
            } satisfies ToolExecutionRecord;
          }
          return entry;
        });

        return {
          finalMessage,
          messages,
          toolExecutions: finalizedExecutions,
          metrics: {
            durationMs: Date.now() - startedAt,
            toolCalls: finalizedExecutions.length,
          },
          threadId,
          costs: costTracker.getReport(),
          raw: result,
        } satisfies LangGraphRunResult;
      } finally {
        setToolObserver(null);
        await stopMcp();
      }
    });
  }
}

export async function runEstateWiseAgent(input: RunInput) {
  const runtime = new EstateWiseLangGraphRuntime();
  return runtime.run({
    goal: input.input,
    threadId: input.threadId,
    context: input.context,
    additionalInstructions: input.additionalInstructions,
  });
}
