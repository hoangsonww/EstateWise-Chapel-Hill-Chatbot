/**
 * EstateWise MCP Client Manager
 *
 * Orchestration layer that registers domain servers, enforces auth,
 * checks health, and routes tool calls with audit logging.
 */

import { canAccess, listAllowedTools } from "../shared/auth.js";
import { createLogger, getAuditLog } from "../shared/logger.js";
import { HealthChecker } from "../shared/health-check.js";
import { McpToolError } from "../shared/error-handler.js";
import type { ToolResult } from "../shared/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolDef {
  name: string;
  description: string;
  inputSchema: unknown;
  handler: (input: unknown) => Promise<ToolResult>;
}

interface RegisteredServer {
  id: string;
  version: string;
  description: string;
  tools: ToolDef[];
  healthy: boolean;
}

// ---------------------------------------------------------------------------
// McpClientManager
// ---------------------------------------------------------------------------

export class McpClientManager {
  private servers = new Map<string, RegisteredServer>();
  private toolToServer = new Map<string, string>();
  private healthChecker = new HealthChecker();
  private log = createLogger("mcp-client");

  /**
   * Register a domain server and its tools.
   */
  registerServer(
    id: string,
    opts: { version: string; description: string; tools: ToolDef[] },
  ): void {
    const server: RegisteredServer = {
      id,
      version: opts.version,
      description: opts.description,
      tools: opts.tools,
      healthy: true,
    };
    this.servers.set(id, server);

    for (const tool of opts.tools) {
      this.toolToServer.set(tool.name, id);
    }

    // Register a health check for this server
    this.healthChecker.registerCheck(id, async () => {
      const srv = this.servers.get(id);
      return {
        name: id,
        healthy: srv?.healthy ?? false,
        message: srv?.healthy ? "ok" : "marked unhealthy",
      };
    });

    this.log.info(`Registered server: ${id} v${opts.version}`, {
      toolCount: opts.tools.length,
    });
  }

  /**
   * List tools available to a specific agent, filtered by auth permissions.
   */
  listAvailableTools(agentId: string): ToolDef[] {
    const serverMap: Record<string, string> = {};
    for (const [toolName, serverId] of this.toolToServer) {
      serverMap[toolName] = serverId;
    }

    const allowed = new Set(listAllowedTools(agentId, serverMap));
    const result: ToolDef[] = [];

    for (const server of this.servers.values()) {
      if (!server.healthy) continue;
      for (const tool of server.tools) {
        if (allowed.has(tool.name)) {
          result.push(tool);
        }
      }
    }

    return result;
  }

  /**
   * Call a tool with auth check, health check, and audit logging.
   */
  async callTool(
    agentId: string,
    toolName: string,
    input: unknown,
  ): Promise<ToolResult> {
    const start = Date.now();
    const serverId = this.toolToServer.get(toolName);

    // Unknown tool
    if (!serverId) {
      const err = new McpToolError({
        toolName,
        code: "NOT_FOUND",
        message: `Tool '${toolName}' is not registered in any server.`,
        recoveryHint:
          "Check the tool name for typos. Use listAvailableTools() to see valid tools.",
        retryable: false,
      });
      this.log.audit({
        action: "callTool",
        agentId,
        toolName,
        success: false,
        durationMs: Date.now() - start,
        metadata: { reason: "unknown_tool" },
      });
      return err.toToolResult();
    }

    // Auth check
    if (!canAccess(agentId, serverId)) {
      const err = new McpToolError({
        toolName,
        code: "UNAUTHORIZED",
        message: `Agent '${agentId}' is not authorized to call '${toolName}' on server '${serverId}'.`,
        recoveryHint:
          "This agent does not have permission for this server. Use a different agent role or request elevated access.",
        retryable: false,
      });
      this.log.audit({
        action: "callTool",
        agentId,
        toolName,
        success: false,
        durationMs: Date.now() - start,
        metadata: { reason: "unauthorized", serverId },
      });
      return err.toToolResult();
    }

    // Health check
    const server = this.servers.get(serverId);
    if (!server || !server.healthy) {
      const err = new McpToolError({
        toolName,
        code: "CONNECTION_REFUSED",
        message: `Server '${serverId}' is currently unhealthy.`,
        recoveryHint:
          "The target server is degraded or offline. Retry later or check server health.",
        retryable: true,
      });
      this.log.audit({
        action: "callTool",
        agentId,
        toolName,
        success: false,
        durationMs: Date.now() - start,
        metadata: { reason: "unhealthy_server", serverId },
      });
      return err.toToolResult();
    }

    // Find and execute the tool handler
    const tool = server.tools.find((t) => t.name === toolName);
    if (!tool) {
      const err = new McpToolError({
        toolName,
        code: "NOT_FOUND",
        message: `Tool '${toolName}' not found on server '${serverId}'.`,
        recoveryHint:
          "The tool registration is inconsistent. This is a server bug.",
        retryable: false,
      });
      return err.toToolResult();
    }

    try {
      const result = await tool.handler(input);
      this.log.audit({
        action: "callTool",
        agentId,
        toolName,
        success: result.success,
        durationMs: Date.now() - start,
        metadata: { serverId },
      });
      return result;
    } catch (err) {
      this.log.audit({
        action: "callTool",
        agentId,
        toolName,
        success: false,
        durationMs: Date.now() - start,
        metadata: {
          serverId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        metadata: { code: "INTERNAL_ERROR", serverId },
      };
    }
  }

  /**
   * Get the overall health status across all registered servers.
   */
  async getServerHealth() {
    return this.healthChecker.getStatus();
  }

  /**
   * Mark a server as healthy (e.g. after recovery).
   */
  markServerHealthy(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.healthy = true;
      this.log.info(`Server marked healthy: ${serverId}`);
    }
  }

  /**
   * Mark a server as unhealthy (e.g. after repeated failures).
   */
  markServerUnhealthy(serverId: string): void {
    const server = this.servers.get(serverId);
    if (server) {
      server.healthy = false;
      this.log.warn(`Server marked unhealthy: ${serverId}`);
    }
  }

  /**
   * Return the audit log (convenience passthrough).
   */
  getAuditLog(limit?: number) {
    return getAuditLog(limit);
  }
}
