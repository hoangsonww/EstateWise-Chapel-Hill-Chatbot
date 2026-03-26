/**
 * EstateWise MCP Error Handler
 *
 * Structured, model-actionable errors with recovery hints.
 * handleToolError() maps common runtime/network failures into
 * McpToolError instances that downstream agents can reason about.
 */

import type { ToolResult } from "./types.js";

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

export type McpErrorCode =
  | "CONNECTION_REFUSED"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "NO_RESULTS"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

// ---------------------------------------------------------------------------
// McpToolError class
// ---------------------------------------------------------------------------

export class McpToolError extends Error {
  public readonly toolName: string;
  public readonly code: McpErrorCode;
  public readonly recoveryHint: string;
  public readonly retryable: boolean;

  constructor(opts: {
    toolName: string;
    code: McpErrorCode;
    message: string;
    recoveryHint: string;
    retryable: boolean;
  }) {
    super(opts.message);
    this.name = "McpToolError";
    this.toolName = opts.toolName;
    this.code = opts.code;
    this.recoveryHint = opts.recoveryHint;
    this.retryable = opts.retryable;
  }

  /**
   * Serialize this error into a ToolResult the model can parse.
   */
  toToolResult(): ToolResult {
    return {
      success: false,
      error: this.message,
      metadata: {
        code: this.code,
        toolName: this.toolName,
        recoveryHint: this.recoveryHint,
        retryable: this.retryable,
      },
    };
  }
}

// ---------------------------------------------------------------------------
// handleToolError – maps raw errors to actionable McpToolError
// ---------------------------------------------------------------------------

/**
 * Inspect an unknown error and return a well-structured McpToolError.
 *
 * @param toolName  Name of the tool that failed.
 * @param err       The caught error (unknown type).
 */
export function handleToolError(toolName: string, err: unknown): McpToolError {
  const message = err instanceof Error ? err.message : String(err);

  // Connection refused (backend down)
  if (message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
    return new McpToolError({
      toolName,
      code: "CONNECTION_REFUSED",
      message: `Cannot reach the backend service for ${toolName}.`,
      recoveryHint:
        "The backend API is unreachable. Retry in 30 seconds or verify the API_BASE_URL environment variable.",
      retryable: true,
    });
  }

  // Timeout
  if (
    message.toLowerCase().includes("timeout") ||
    message.includes("ETIMEDOUT") ||
    message.includes("AbortError")
  ) {
    return new McpToolError({
      toolName,
      code: "TIMEOUT",
      message: `Request to ${toolName} timed out.`,
      recoveryHint:
        "The request took too long. Reduce the query scope (fewer filters, smaller limit) and retry.",
      retryable: true,
    });
  }

  // 401 Unauthorized
  if (
    message.includes("401") ||
    message.toLowerCase().includes("unauthorized")
  ) {
    return new McpToolError({
      toolName,
      code: "UNAUTHORIZED",
      message: `Authentication failed for ${toolName}.`,
      recoveryHint:
        "The API key or token is missing or invalid. Check the AUTH_TOKEN environment variable.",
      retryable: false,
    });
  }

  // 404 Not Found
  if (message.includes("404") || message.toLowerCase().includes("not found")) {
    return new McpToolError({
      toolName,
      code: "NOT_FOUND",
      message: `Resource not found in ${toolName}.`,
      recoveryHint:
        "The requested resource does not exist. Verify the ID or query parameters and try a broader search.",
      retryable: false,
    });
  }

  // 429 Rate limited
  if (message.includes("429") || message.toLowerCase().includes("rate limit")) {
    return new McpToolError({
      toolName,
      code: "RATE_LIMITED",
      message: `Rate limit exceeded for ${toolName}.`,
      recoveryHint:
        "Too many requests. Wait at least 60 seconds before retrying, or reduce call frequency.",
      retryable: true,
    });
  }

  // No results
  if (
    message.toLowerCase().includes("no results") ||
    message.toLowerCase().includes("empty")
  ) {
    return new McpToolError({
      toolName,
      code: "NO_RESULTS",
      message: `No results returned from ${toolName}.`,
      recoveryHint:
        "The query returned zero matches. Broaden the filters (wider price range, more property types, larger area) and retry.",
      retryable: false,
    });
  }

  // Catch-all
  return new McpToolError({
    toolName,
    code: "INTERNAL_ERROR",
    message: `Unexpected error in ${toolName}: ${message}`,
    recoveryHint:
      "An unexpected error occurred. Check the server logs for details and retry if the issue appears transient.",
    retryable: false,
  });
}
