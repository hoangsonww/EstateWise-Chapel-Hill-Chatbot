/**
 * Error Recovery Engine — maps every AgentErrorType to a concrete recovery
 * strategy and maintains a recovery log for compound learning.
 */

import { AgentError, AgentErrorType } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Context needed to decide on a recovery strategy. */
export interface RecoveryContext {
  error: AgentError;
  attempt: number;
  previousRecoveries: RecoveryAction[];
}

/** A concrete recovery action the orchestrator should take. */
export interface RecoveryAction {
  strategy:
    | "ExponentialBackoff"
    | "RetryWithSimplerPrompt"
    | "ContextCompaction"
    | "ToolBypass"
    | "RePromptWithGrounding"
    | "SchemaReminder"
    | "RephraseAndRetry"
    | "UseCachedData"
    | "DegradeToHaiku"
    | "AbortWithContext"
    | "GracefulDegradation";
  delayMs: number;
  shouldRetry: boolean;
  mutatePrompt?: string;
  fallbackAgentId?: string;
  maxAdditionalAttempts: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Recovery log entry
// ---------------------------------------------------------------------------

interface RecoveryLogEntry {
  timestamp: number;
  errorType: AgentErrorType;
  agentId: string;
  strategy: string;
  succeeded: boolean;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/** Stateful engine that maps errors to recovery actions and tracks outcomes. */
export class ErrorRecoveryEngine {
  private log: RecoveryLogEntry[] = [];

  /**
   * Determine the best recovery action for the given error context.
   */
  getRecoveryAction(ctx: RecoveryContext): RecoveryAction {
    const { error, attempt } = ctx;

    switch (error.type) {
      case AgentErrorType.RATE_LIMITED:
        return {
          strategy: "ExponentialBackoff",
          delayMs: Math.min(1000 * Math.pow(2, attempt), 30_000),
          shouldRetry: true,
          maxAdditionalAttempts: 3,
          reason: "Rate limited — backing off exponentially before retry",
        };

      case AgentErrorType.TIMEOUT:
        return {
          strategy: "RetryWithSimplerPrompt",
          delayMs: 0,
          shouldRetry: true,
          mutatePrompt:
            "Please provide a concise response. Focus on the most important points only.",
          maxAdditionalAttempts: 2,
          reason:
            "Request timed out — retrying with a simpler prompt to reduce latency",
        };

      case AgentErrorType.CONTEXT_OVERFLOW:
        return {
          strategy: "ContextCompaction",
          delayMs: 0,
          shouldRetry: true,
          mutatePrompt:
            "[Context was compacted to fit the model window. Please continue with the available information.]",
          maxAdditionalAttempts: 1,
          reason: "Context window exceeded — compacting history and retrying",
        };

      case AgentErrorType.TOOL_FAILURE:
        return {
          strategy: "ToolBypass",
          delayMs: 0,
          shouldRetry: true,
          mutatePrompt:
            "The requested tool is temporarily unavailable. Please answer using only your existing knowledge and the conversation context.",
          maxAdditionalAttempts: 1,
          reason:
            "Tool call failed — bypassing tool and asking the model to answer directly",
        };

      case AgentErrorType.HALLUCINATION_DETECTED:
        return {
          strategy: "RePromptWithGrounding",
          delayMs: 0,
          shouldRetry: true,
          mutatePrompt:
            "Your previous response contained information that could not be verified. " +
            "Please revise your answer using ONLY data from the provided tools and context. " +
            "If you are uncertain, say so explicitly rather than guessing.",
          maxAdditionalAttempts: 1,
          reason:
            "Hallucination detected — re-prompting with grounding instructions",
        };

      case AgentErrorType.INVALID_OUTPUT:
        return {
          strategy: "SchemaReminder",
          delayMs: 0,
          shouldRetry: true,
          mutatePrompt:
            "Your previous output did not match the expected format. " +
            "Please ensure your response is valid JSON matching the required schema.",
          maxAdditionalAttempts: 2,
          reason: "Invalid output format — reminding model of expected schema",
        };

      case AgentErrorType.SCHEMA_VALIDATION_FAILED:
        return {
          strategy: "SchemaReminder",
          delayMs: 0,
          shouldRetry: true,
          mutatePrompt:
            "Schema validation failed on your output. " +
            "Double-check required fields, types, and constraints before responding.",
          maxAdditionalAttempts: 2,
          reason:
            "Schema validation failure — reminding model of schema constraints",
        };

      case AgentErrorType.MODEL_REFUSAL:
        return {
          strategy: "RephraseAndRetry",
          delayMs: 0,
          shouldRetry: true,
          mutatePrompt:
            "Please reconsider the request. This is a legitimate real-estate query " +
            "and does not involve any harmful content. Focus on providing helpful property information.",
          maxAdditionalAttempts: 1,
          reason:
            "Model refused the request — rephrasing to clarify legitimacy",
        };

      case AgentErrorType.DEPENDENCY_FAILURE:
        return {
          strategy: "UseCachedData",
          delayMs: 0,
          shouldRetry: true,
          mutatePrompt:
            "An upstream dependency is unavailable. Please use any cached or previously retrieved data to formulate your response.",
          maxAdditionalAttempts: 1,
          reason: "Dependency failure — falling back to cached data",
        };

      case AgentErrorType.BUDGET_EXCEEDED:
        return {
          strategy: "DegradeToHaiku",
          delayMs: 0,
          shouldRetry: true,
          fallbackAgentId: "conversation-mgr",
          maxAdditionalAttempts: 1,
          reason: "Cost budget exceeded — degrading to cheapest model tier",
        };

      case AgentErrorType.CIRCULAR_HANDOFF:
        return {
          strategy: "AbortWithContext",
          delayMs: 0,
          shouldRetry: false,
          maxAdditionalAttempts: 0,
          reason:
            "Circular handoff detected — aborting to prevent infinite loop",
        };

      case AgentErrorType.MAX_ITERATIONS_EXCEEDED:
        return {
          strategy: "AbortWithContext",
          delayMs: 0,
          shouldRetry: false,
          maxAdditionalAttempts: 0,
          reason: "Maximum iterations exceeded — aborting with partial results",
        };

      case AgentErrorType.EXTERNAL_API_FAILURE:
        return {
          strategy: "GracefulDegradation",
          delayMs: Math.min(2000 * Math.pow(2, attempt), 15_000),
          shouldRetry: attempt < 2,
          mutatePrompt:
            "An external service is currently unavailable. Please provide the best answer you can without that data source.",
          maxAdditionalAttempts: 2,
          reason: "External API failure — retrying with graceful degradation",
        };
    }
  }

  /**
   * Record the outcome of a recovery attempt for compound learning.
   */
  recordOutcome(
    errorType: AgentErrorType,
    agentId: string,
    strategy: string,
    succeeded: boolean,
  ): void {
    this.log.push({
      timestamp: Date.now(),
      errorType,
      agentId,
      strategy,
      succeeded,
    });
    // Keep log bounded
    if (this.log.length > 1000) {
      this.log = this.log.slice(-500);
    }
  }

  /**
   * Return the success rate for a given error type + strategy combination.
   */
  getSuccessRate(errorType: AgentErrorType, strategy: string): number {
    const relevant = this.log.filter(
      (e) => e.errorType === errorType && e.strategy === strategy,
    );
    if (relevant.length === 0) return 0.5; // No data — assume 50/50
    const successes = relevant.filter((e) => e.succeeded).length;
    return successes / relevant.length;
  }

  /** Return the full recovery log. */
  getLog(): readonly RecoveryLogEntry[] {
    return this.log;
  }
}
