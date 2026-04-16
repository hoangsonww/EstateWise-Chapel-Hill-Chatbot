import { config } from "./config.js";
import { recordGovernanceEvent } from "./metrics.js";

class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];
  private active = 0;

  constructor(maxPermits: number) {
    this.permits = Math.max(1, maxPermits);
  }

  async acquire(): Promise<() => void> {
    if (this.active < this.permits) {
      this.active += 1;
      return () => this.release();
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
    return () => this.release();
  }

  snapshot() {
    return {
      maxConcurrent: this.permits,
      inFlight: this.active,
      queued: this.queue.length,
    };
  }

  private release() {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

const semaphore = new Semaphore(config.toolMaxConcurrent);

const allowedTools = new Set(config.toolAllowList);
const deniedTools = new Set(config.toolDenyList);

function ensureToolAllowed(toolName: string) {
  if (deniedTools.has(toolName)) {
    recordGovernanceEvent("denylist_block");
    throw new Error(`Tool '${toolName}' is disabled by MCP_TOOL_DENYLIST`);
  }
  if (allowedTools.size > 0 && !allowedTools.has(toolName)) {
    recordGovernanceEvent("allowlist_block");
    throw new Error(`Tool '${toolName}' is not allowed by MCP_TOOL_ALLOWLIST`);
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  toolName: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      recordGovernanceEvent("timeout");
      reject(
        new Error(
          `Tool '${toolName}' timed out after ${timeoutMs}ms (MCP_TOOL_TIMEOUT_MS)`,
        ),
      );
    }, timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function estimatePayloadBytes(value: unknown): number {
  try {
    return Buffer.byteLength(JSON.stringify(value ?? null), "utf8");
  } catch {
    return 0;
  }
}

export async function runWithToolGovernance<T>(
  toolName: string,
  args: unknown,
  handler: () => Promise<T>,
): Promise<T> {
  ensureToolAllowed(toolName);
  const argBytes = estimatePayloadBytes(args);
  if (argBytes > config.toolMaxArgBytes) {
    recordGovernanceEvent("arg_size_block");
    throw new Error(
      `Tool '${toolName}' payload too large: ${argBytes} bytes exceeds MCP_TOOL_MAX_ARG_BYTES=${config.toolMaxArgBytes}`,
    );
  }

  const release = await semaphore.acquire();
  try {
    return await withTimeout(handler(), config.toolTimeoutMs, toolName);
  } finally {
    release();
  }
}

export function getGovernanceSnapshot() {
  return {
    toolTimeoutMs: config.toolTimeoutMs,
    toolMaxArgBytes: config.toolMaxArgBytes,
    toolAllowList: config.toolAllowList,
    toolDenyList: config.toolDenyList,
    ...semaphore.snapshot(),
  };
}
