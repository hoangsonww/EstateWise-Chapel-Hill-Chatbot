/**
 * Handoff Protocol — manages agent-to-agent delegation with depth limits,
 * circular-detection, health checks, and automatic fallback.
 */

import { randomUUID } from "node:crypto";
import { AgentRegistry } from "./agent-registry.js";
import {
  AgentError,
  AgentErrorType,
  ConversationMessage,
  HandoffPayload,
  HandoffType,
  TaskResult,
} from "./types.js";

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------

/** Maximum depth of chained handoffs to prevent runaway delegation. */
export const MAX_HANDOFF_DEPTH = 3;

/** Outcome of a single handoff attempt. */
export interface HandoffResult {
  success: boolean;
  payload: HandoffPayload;
  result?: TaskResult;
  error?: AgentError;
  fallbackUsed: boolean;
  actualAgentId: string;
}

// ---------------------------------------------------------------------------
// Handoff Manager
// ---------------------------------------------------------------------------

/** Orchestrates safe handoffs between agents. */
export class HandoffManager {
  private activeChains = new Map<string, HandoffPayload[]>();
  private readonly registry: AgentRegistry;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  /**
   * Initiate a handoff from one agent to another. Enforces depth limits,
   * circular detection, and health checks. Falls back automatically if the
   * target agent is unhealthy.
   */
  async initiateHandoff(
    params: {
      type: HandoffType;
      fromAgentId: string;
      toAgentId: string;
      taskDescription: string;
      context: Record<string, unknown>;
      conversationHistory: ConversationMessage[];
      constraints: string[];
      chainId?: string;
    },
    executeAgent: (agentId: string, prompt: string) => Promise<TaskResult>,
  ): Promise<HandoffResult> {
    const chainId = params.chainId ?? randomUUID();
    const chain = this.activeChains.get(chainId) ?? [];
    const depth = chain.length;

    // Depth guard
    if (depth >= MAX_HANDOFF_DEPTH) {
      const err = new AgentError({
        type: AgentErrorType.MAX_ITERATIONS_EXCEEDED,
        message: `Handoff chain exceeded max depth of ${MAX_HANDOFF_DEPTH}`,
        agentId: params.fromAgentId,
        metadata: { chainId, depth },
      });
      return {
        success: false,
        payload: this.buildPayload(params, chainId, depth),
        error: err,
        fallbackUsed: false,
        actualAgentId: params.toAgentId,
      };
    }

    // Circular detection
    const visited = new Set(chain.map((p) => p.toAgentId));
    if (visited.has(params.toAgentId)) {
      const err = new AgentError({
        type: AgentErrorType.CIRCULAR_HANDOFF,
        message: `Circular handoff detected: "${params.toAgentId}" already in chain [${[...visited].join(" -> ")}]`,
        agentId: params.fromAgentId,
        metadata: { chainId, visited: [...visited] },
      });
      return {
        success: false,
        payload: this.buildPayload(params, chainId, depth),
        error: err,
        fallbackUsed: false,
        actualAgentId: params.toAgentId,
      };
    }

    // Health check with auto-fallback
    let targetId = params.toAgentId;
    let fallbackUsed = false;
    if (!this.registry.isHealthy(targetId)) {
      const fallback = this.registry.findHealthyFallback(targetId);
      if (fallback) {
        targetId = fallback.id;
        fallbackUsed = true;
      } else {
        const err = new AgentError({
          type: AgentErrorType.DEPENDENCY_FAILURE,
          message: `Target agent "${params.toAgentId}" is unhealthy and no fallback available`,
          agentId: params.fromAgentId,
          metadata: { chainId, targetId: params.toAgentId },
        });
        return {
          success: false,
          payload: this.buildPayload(params, chainId, depth),
          error: err,
          fallbackUsed: false,
          actualAgentId: params.toAgentId,
        };
      }
    }

    const payload = this.buildPayload(
      { ...params, toAgentId: targetId },
      chainId,
      depth,
    );

    // Track chain
    chain.push(payload);
    this.activeChains.set(chainId, chain);

    // Build prompt and execute
    const prompt = this.buildHandoffPrompt(payload);

    try {
      const result = await executeAgent(targetId, prompt);
      return {
        success: result.success,
        payload,
        result,
        error: result.error,
        fallbackUsed,
        actualAgentId: targetId,
      };
    } catch (err) {
      const agentErr = new AgentError({
        type: AgentErrorType.EXTERNAL_API_FAILURE,
        message: err instanceof Error ? err.message : String(err),
        agentId: targetId,
        cause: err instanceof Error ? err : undefined,
      });
      return {
        success: false,
        payload,
        error: agentErr,
        fallbackUsed,
        actualAgentId: targetId,
      };
    }
  }

  /**
   * Build an XML-structured prompt that gives the receiving agent full context.
   */
  buildHandoffPrompt(payload: HandoffPayload): string {
    const recentHistory = payload.conversationHistory.slice(-10);
    const historyXml = recentHistory
      .map(
        (m) =>
          `  <message role="${m.role}"${m.name ? ` name="${m.name}"` : ""}>\n    ${m.content}\n  </message>`,
      )
      .join("\n");

    const constraintsList =
      payload.constraints.length > 0
        ? payload.constraints.map((c) => `  <constraint>${c}</constraint>`).join("\n")
        : "  <constraint>none</constraint>";

    const contextEntries = Object.entries(payload.context)
      .map(
        ([k, v]) =>
          `  <entry key="${k}">${typeof v === "string" ? v : JSON.stringify(v)}</entry>`,
      )
      .join("\n");

    return `<handoff type="${payload.type}" depth="${payload.depth}">
  <from>${payload.fromAgentId}</from>
  <to>${payload.toAgentId}</to>
  <task>${payload.taskDescription}</task>
  <context>
${contextEntries || "  <entry key=\"none\">empty</entry>"}
  </context>
  <constraints>
${constraintsList}
  </constraints>
  <history>
${historyXml || "  <message role=\"system\">No prior history</message>"}
  </history>
</handoff>`;
  }

  /** Mark a chain as complete and remove it from tracking. */
  completeChain(chainId: string): void {
    this.activeChains.delete(chainId);
  }

  /** Get the current state of an active chain. */
  getActiveChain(chainId: string): HandoffPayload[] | undefined {
    return this.activeChains.get(chainId);
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private buildPayload(
    params: {
      type: HandoffType;
      fromAgentId: string;
      toAgentId: string;
      taskDescription: string;
      context: Record<string, unknown>;
      conversationHistory: ConversationMessage[];
      constraints: string[];
    },
    chainId: string,
    depth: number,
  ): HandoffPayload {
    return {
      type: params.type,
      fromAgentId: params.fromAgentId,
      toAgentId: params.toAgentId,
      taskDescription: params.taskDescription,
      context: params.context,
      conversationHistory: params.conversationHistory,
      constraints: params.constraints,
      depth,
      chainId,
      timestamp: Date.now(),
    };
  }
}
