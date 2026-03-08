import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { parseRequiredToolsMode, type RequiredToolsMode } from "./contracts.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.floor(parsed);
}

function parseArgs(raw: string | undefined): string[] | null {
  if (!raw || raw.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((v) => typeof v === "string")) {
      return parsed;
    }
  } catch {
    // fallback below
  }
  const parts = raw
    .split(" ")
    .map((v) => v.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : null;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
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

export interface ToolClientStartOptions {
  requiredTools?: string[];
  mode?: RequiredToolsMode;
}

export interface ToolClientCallOptions {
  timeoutMs?: number;
  retries?: number;
}

/**
 * Spawns the local MCP server and exposes resilient list/call helpers.
 * Defaults target `../mcp/dist/server.js`, but all launch params are env-overridable.
 */
export class ToolClient {
  private client: McpClient | null = null;
  private availableTools = new Set<string>();
  private lastToolsRefreshAt = 0;

  private readonly mcpDir = process.env.MCP_SERVER_CWD || this.defaultMcpDir();
  private readonly command = process.env.MCP_SERVER_COMMAND || process.execPath;
  private readonly args = this.resolveArgs();
  private readonly startupRetries = Math.max(
    0,
    toInt(process.env.MCP_CLIENT_STARTUP_RETRIES, 2),
  );
  private readonly startupRetryMs = Math.max(
    100,
    toInt(process.env.MCP_CLIENT_STARTUP_RETRY_MS, 750),
  );
  private readonly defaultCallTimeoutMs = Math.max(
    1_000,
    toInt(process.env.MCP_CLIENT_CALL_TIMEOUT_MS, 45_000),
  );
  private readonly listCacheMs = Math.max(
    0,
    toInt(process.env.MCP_CLIENT_LIST_CACHE_MS, 15_000),
  );
  private readonly requiredToolsMode = parseRequiredToolsMode(
    process.env.MCP_REQUIRED_TOOLS_MODE,
  );

  private defaultMcpDir() {
    return new URL("../../../mcp/", import.meta.url).pathname;
  }

  private resolveArgs() {
    const parsed = parseArgs(process.env.MCP_SERVER_ARGS);
    if (parsed) return parsed;
    return ["dist/server.js"];
  }

  /** Start stdio MCP client and optionally validate required tools contract. */
  async start(options: ToolClientStartOptions = {}): Promise<void> {
    if (!this.client) {
      let lastError: unknown;
      const attempts = this.startupRetries + 1;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          const transport = new StdioClientTransport({
            command: this.command,
            args: this.args,
            cwd: this.mcpDir,
            stderr: "inherit",
            env: process.env,
          } as any);
          const client = new McpClient({
            name: "agentic-ai",
            version: "0.2.0",
          });
          await client.connect(transport);
          this.client = client;
          this.lastToolsRefreshAt = 0;
          await this.refreshToolCatalog(true);
          break;
        } catch (err) {
          lastError = err;
          if (attempt < attempts) {
            // eslint-disable-next-line no-console
            console.error(
              `[agentic-ai] MCP start attempt ${attempt}/${attempts} failed, retrying in ${this.startupRetryMs}ms`,
            );
            await sleep(this.startupRetryMs * attempt);
          }
        }
      }
      if (!this.client) {
        throw lastError instanceof Error
          ? lastError
          : new Error(String(lastError ?? "Failed to start MCP client"));
      }
    }

    const required = options.requiredTools ?? [];
    if (required.length > 0) {
      await this.ensureToolsAvailable(required, options.mode);
    }
  }

  /** Stop the MCP client and terminate the spawned server process. */
  async stop(): Promise<void> {
    try {
      await this.client?.close();
    } catch {
      // ignore close errors
    }
    this.client = null;
    this.availableTools.clear();
    this.lastToolsRefreshAt = 0;
  }

  /** List cached tool names; refreshes from server when stale. */
  async listTools(forceRefresh = false): Promise<string[]> {
    await this.refreshToolCatalog(forceRefresh);
    return Array.from(this.availableTools).sort();
  }

  /** Ensure required tools exist in MCP registry; strict mode throws on drift. */
  async ensureToolsAvailable(
    requiredTools: string[],
    mode = this.requiredToolsMode,
  ): Promise<{ missing: string[]; availableCount: number }> {
    if (mode === "off") {
      return { missing: [], availableCount: this.availableTools.size };
    }
    await this.refreshToolCatalog(false);
    const missing = requiredTools.filter(
      (name) => !this.availableTools.has(name),
    );
    if (missing.length > 0) {
      const message = `[agentic-ai] Missing required MCP tools (${missing.length}): ${missing.join(", ")}`;
      if (mode === "strict") throw new Error(message);
      // eslint-disable-next-line no-console
      console.error(`${message} (continuing because mode=warn)`);
    }
    return { missing, availableCount: this.availableTools.size };
  }

  /** Invoke an MCP tool with timeout + retry behavior. */
  async callTool(
    name: string,
    args: Record<string, unknown> = {},
    options: ToolClientCallOptions = {},
  ) {
    if (!this.client) throw new Error("ToolClient not started");
    const retries = Math.max(0, options.retries ?? 1);
    const timeoutMs = options.timeoutMs ?? this.defaultCallTimeoutMs;
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await withTimeout(
          this.client.callTool({ name, arguments: args }),
          timeoutMs,
          `MCP callTool(${name})`,
        );
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await sleep(120 * (attempt + 1));
        }
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(String(lastError ?? `Tool call failed: ${name}`));
  }

  private async refreshToolCatalog(forceRefresh: boolean) {
    if (!this.client) throw new Error("ToolClient not started");
    const stale =
      Date.now() - this.lastToolsRefreshAt > this.listCacheMs || forceRefresh;
    if (!stale) return;
    const listed = await withTimeout(
      this.client.listTools(),
      this.defaultCallTimeoutMs,
      "MCP listTools",
    );
    this.availableTools = new Set(listed.tools.map((tool) => tool.name));
    this.lastToolsRefreshAt = Date.now();
  }
}
