/**
 * Agentic tool-use loop — drives an LLM through iterative tool calls until
 * it produces a final text response or a safety limit is reached.
 */

import { randomUUID } from "node:crypto";
import {
  AgentError,
  AgentErrorType,
  ConversationMessage,
  MODEL_CONFIGS,
  TaskMetadata,
  TaskResult,
  ToolCallRecord,
  type ModelId,
} from "./types.js";

// ---------------------------------------------------------------------------
// Interfaces the caller must satisfy
// ---------------------------------------------------------------------------

/** Configuration for one run of the agent loop. */
export interface AgentLoopConfig {
  agentId: string;
  modelId: ModelId;
  systemPrompt: string;
  maxIterations: number;
  timeoutMs: number;
  maxContextPercent: number;
  budgetLimitUsd?: number;
  parentTaskId?: string;
}

/** Minimal LLM client abstraction. */
export interface LLMClient {
  chat(params: {
    model: string;
    messages: Array<{ role: string; content: string; name?: string; tool_call_id?: string }>;
    tools?: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>;
  }): Promise<{
    stop_reason: "end_turn" | "tool_use" | "max_tokens";
    content: Array<
      | { type: "text"; text: string }
      | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
    >;
    usage: { input_tokens: number; output_tokens: number };
  }>;
}

/** Executes a single tool call. */
export interface ToolExecutor {
  execute(
    name: string,
    input: Record<string, unknown>,
  ): Promise<{ output: unknown; durationMs: number }>;
  availableTools(): Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rough token estimate: ~4 characters per token. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function totalTokens(messages: Array<{ role: string; content: string }>): number {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

function compactMessages(
  messages: Array<{ role: string; content: string; name?: string; tool_call_id?: string }>,
): Array<{ role: string; content: string; name?: string; tool_call_id?: string }> {
  if (messages.length <= 6) return messages;

  const first2 = messages.slice(0, 2);
  const last4 = messages.slice(-4);
  const middle = messages.slice(2, -4);

  const summaryParts: string[] = [];
  for (const m of middle) {
    const prefix = m.name ? `${m.role}(${m.name})` : m.role;
    const snippet = m.content.length > 200 ? m.content.slice(0, 200) + "..." : m.content;
    summaryParts.push(`[${prefix}]: ${snippet}`);
  }

  const summaryMessage = {
    role: "system" as const,
    content: `[Context compacted — ${middle.length} messages summarized]\n${summaryParts.join("\n")}`,
  };

  return [...first2, summaryMessage, ...last4];
}

function classifyError(err: unknown): AgentErrorType {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes("rate") || msg.includes("429") || msg.includes("throttl")) {
    return AgentErrorType.RATE_LIMITED;
  }
  if (msg.includes("timeout") || msg.includes("timed out") || msg.includes("deadline")) {
    return AgentErrorType.TIMEOUT;
  }
  if (msg.includes("context") && (msg.includes("length") || msg.includes("overflow") || msg.includes("too long"))) {
    return AgentErrorType.CONTEXT_OVERFLOW;
  }
  if (msg.includes("refus") || msg.includes("cannot") || msg.includes("i'm sorry")) {
    return AgentErrorType.MODEL_REFUSAL;
  }
  if (msg.includes("tool") || msg.includes("function")) {
    return AgentErrorType.TOOL_FAILURE;
  }
  return AgentErrorType.EXTERNAL_API_FAILURE;
}

function estimateCostUsd(
  modelId: ModelId,
  inputTokens: number,
  outputTokens: number,
): number {
  const cfg = MODEL_CONFIGS[modelId];
  return (
    (inputTokens * cfg.inputCostPer1M + outputTokens * cfg.outputCostPer1M) /
    1_000_000
  );
}

// ---------------------------------------------------------------------------
// Main Loop
// ---------------------------------------------------------------------------

/**
 * Runs an agentic tool-use loop: call the LLM, execute any requested tools,
 * feed results back, repeat until the model produces a final text answer or
 * a safety limit is hit.
 */
export async function runAgentLoop(
  config: AgentLoopConfig,
  llm: LLMClient,
  toolExec: ToolExecutor,
  initialMessages: ConversationMessage[],
): Promise<TaskResult<string>> {
  const taskId = randomUUID();
  const startedAt = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;
  const toolCalls: ToolCallRecord[] = [];

  const modelConfig = MODEL_CONFIGS[config.modelId];
  const contextLimit = Math.floor(
    modelConfig.contextWindow * (config.maxContextPercent / 100),
  );

  // Build message array from conversation history
  let messages: Array<{ role: string; content: string; name?: string; tool_call_id?: string }> = [
    { role: "system", content: config.systemPrompt },
    ...initialMessages.map((m) => ({
      role: m.role,
      content: m.content,
      name: m.name,
      tool_call_id: m.toolCallId,
    })),
  ];

  const tools = toolExec.availableTools();
  let finalText = "";

  for (let iteration = 0; iteration < config.maxIterations; iteration++) {
    // Safety: timeout check
    if (Date.now() - startedAt > config.timeoutMs) {
      return makeResult({
        success: false,
        error: new AgentError({
          type: AgentErrorType.TIMEOUT,
          message: `Agent loop timed out after ${config.timeoutMs}ms`,
          agentId: config.agentId,
        }),
        taskId,
        config,
        startedAt,
        totalInputTokens,
        totalOutputTokens,
        totalCostUsd,
        toolCalls,
      });
    }

    // Safety: context budget check
    const currentTokens = totalTokens(messages);
    if (currentTokens > contextLimit) {
      messages = compactMessages(messages);
      if (totalTokens(messages) > contextLimit) {
        return makeResult({
          success: false,
          error: new AgentError({
            type: AgentErrorType.CONTEXT_OVERFLOW,
            message: `Context window exceeded after compaction: ${totalTokens(messages)} > ${contextLimit}`,
            agentId: config.agentId,
          }),
          taskId,
          config,
          startedAt,
          totalInputTokens,
          totalOutputTokens,
          totalCostUsd,
          toolCalls,
        });
      }
    }

    // Safety: cost check
    if (config.budgetLimitUsd !== undefined && totalCostUsd > config.budgetLimitUsd) {
      return makeResult({
        success: false,
        error: new AgentError({
          type: AgentErrorType.BUDGET_EXCEEDED,
          message: `Cost budget exceeded: $${totalCostUsd.toFixed(4)} > $${config.budgetLimitUsd}`,
          agentId: config.agentId,
        }),
        taskId,
        config,
        startedAt,
        totalInputTokens,
        totalOutputTokens,
        totalCostUsd,
        toolCalls,
      });
    }

    // Call the LLM
    let response;
    try {
      response = await llm.chat({
        model: modelConfig.apiModelId,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      });
    } catch (err) {
      const errType = classifyError(err);
      return makeResult({
        success: false,
        error: new AgentError({
          type: errType,
          message: err instanceof Error ? err.message : String(err),
          agentId: config.agentId,
          cause: err instanceof Error ? err : undefined,
        }),
        taskId,
        config,
        startedAt,
        totalInputTokens,
        totalOutputTokens,
        totalCostUsd,
        toolCalls,
      });
    }

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;
    totalCostUsd += estimateCostUsd(
      config.modelId,
      response.usage.input_tokens,
      response.usage.output_tokens,
    );

    // Process response content
    const textBlocks = response.content.filter(
      (b): b is { type: "text"; text: string } => b.type === "text",
    );
    const toolUseBlocks = response.content.filter(
      (b): b is { type: "tool_use"; id: string; name: string; input: Record<string, unknown> } =>
        b.type === "tool_use",
    );

    // If no tool use, we have our final answer
    if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
      finalText = textBlocks.map((b) => b.text).join("\n");
      break;
    }

    // Append assistant message with text if any
    if (textBlocks.length > 0) {
      messages.push({
        role: "assistant",
        content: textBlocks.map((b) => b.text).join("\n"),
      });
    }

    // Execute tool calls in parallel
    const toolPromises = toolUseBlocks.map(async (block) => {
      const callStart = Date.now();
      try {
        const result = await toolExec.execute(block.name, block.input);
        const record: ToolCallRecord = {
          toolName: block.name,
          input: block.input,
          output: result.output,
          durationMs: result.durationMs,
          timestamp: callStart,
        };
        toolCalls.push(record);
        return {
          id: block.id,
          name: block.name,
          success: true,
          output: typeof result.output === "string"
            ? result.output
            : JSON.stringify(result.output),
        };
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const record: ToolCallRecord = {
          toolName: block.name,
          input: block.input,
          error: errMsg,
          durationMs: Date.now() - callStart,
          timestamp: callStart,
        };
        toolCalls.push(record);
        return { id: block.id, name: block.name, success: false, output: `Error: ${errMsg}` };
      }
    });

    const settled = await Promise.allSettled(toolPromises);

    for (const result of settled) {
      if (result.status === "fulfilled") {
        const r = result.value;
        messages.push({
          role: "tool" as const,
          content: r.output,
          tool_call_id: r.id,
          name: r.name,
        });
      } else {
        messages.push({
          role: "tool" as const,
          content: `Tool execution failed: ${result.reason}`,
        });
      }
    }
  }

  // If we exhausted iterations without a final answer
  if (!finalText) {
    return makeResult({
      success: false,
      error: new AgentError({
        type: AgentErrorType.MAX_ITERATIONS_EXCEEDED,
        message: `Agent loop hit max iterations (${config.maxIterations}) without producing a final answer`,
        agentId: config.agentId,
      }),
      taskId,
      config,
      startedAt,
      totalInputTokens,
      totalOutputTokens,
      totalCostUsd,
      toolCalls,
    });
  }

  return makeResult({
    success: true,
    data: finalText,
    taskId,
    config,
    startedAt,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd,
    toolCalls,
  });
}

// ---------------------------------------------------------------------------
// Result builder
// ---------------------------------------------------------------------------

function makeResult(params: {
  success: boolean;
  data?: string;
  error?: AgentError;
  taskId: string;
  config: AgentLoopConfig;
  startedAt: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  toolCalls: ToolCallRecord[];
}): TaskResult<string> {
  const now = Date.now();
  const metadata: TaskMetadata = {
    taskId: params.taskId,
    agentId: params.config.agentId,
    status: params.success ? "completed" : "failed",
    createdAt: params.startedAt,
    startedAt: params.startedAt,
    completedAt: now,
    attempt: 1,
    parentTaskId: params.config.parentTaskId,
    inputTokens: params.totalInputTokens,
    outputTokens: params.totalOutputTokens,
    costUsd: params.totalCostUsd,
    durationMs: now - params.startedAt,
    errorType: params.error?.type,
    errorMessage: params.error?.message,
  };

  return {
    success: params.success,
    data: params.data,
    error: params.error,
    metadata,
    toolCalls: params.toolCalls,
  };
}
