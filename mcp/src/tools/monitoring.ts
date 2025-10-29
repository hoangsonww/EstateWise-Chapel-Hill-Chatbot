import { z } from "zod";
import type { ToolDef } from "../core/registry.js";

/**
 * Monitoring & metrics tools for tracking MCP server usage and performance.
 */

// In-memory metrics storage
const metrics = {
  toolCalls: new Map<string, number>(),
  errors: new Map<string, number>(),
  lastCalls: new Map<string, number>(),
  totalRequests: 0,
  totalErrors: 0,
  startTime: Date.now(),
};

/** Record a tool call */
export function recordToolCall(toolName: string, success: boolean) {
  metrics.totalRequests++;
  metrics.toolCalls.set(toolName, (metrics.toolCalls.get(toolName) || 0) + 1);
  metrics.lastCalls.set(toolName, Date.now());
  
  if (!success) {
    metrics.totalErrors++;
    metrics.errors.set(toolName, (metrics.errors.get(toolName) || 0) + 1);
  }
}

export const monitoringTools: ToolDef[] = [
  {
    name: "monitoring.stats",
    description:
      "Get comprehensive statistics about MCP server usage including call counts, error rates, and performance metrics.",
    schema: { detailed: z.boolean().optional() },
    handler: async (args: any) => {
      const { detailed = false } = args as { detailed?: boolean };
      
      const uptime = Date.now() - metrics.startTime;
      const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
      
      const stats = {
        uptime: {
          ms: uptime,
          hours: parseFloat(uptimeHours),
          formatted: formatDuration(uptime),
        },
        requests: {
          total: metrics.totalRequests,
          errors: metrics.totalErrors,
          successRate: metrics.totalRequests > 0 
            ? ((metrics.totalRequests - metrics.totalErrors) / metrics.totalRequests * 100).toFixed(2) + '%'
            : 'N/A',
        },
        toolCalls: Object.fromEntries(metrics.toolCalls),
        errors: Object.fromEntries(metrics.errors),
      };

      if (detailed) {
        const lastCalls: Record<string, string> = {};
        for (const [tool, timestamp] of metrics.lastCalls) {
          lastCalls[tool] = new Date(timestamp).toISOString();
        }
        (stats as any).lastCalls = lastCalls;
        
        // Top tools by usage
        const topTools = Array.from(metrics.toolCalls.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));
        (stats as any).topTools = topTools;
      }

      return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
    },
  },
  {
    name: "monitoring.toolUsage",
    description:
      "Get usage statistics for a specific tool including call count, error rate, and last called time.",
    schema: { toolName: z.string() },
    handler: async (args: any) => {
      const { toolName } = args as { toolName: string };
      
      const calls = metrics.toolCalls.get(toolName) || 0;
      const errors = metrics.errors.get(toolName) || 0;
      const lastCall = metrics.lastCalls.get(toolName);
      
      const usage = {
        toolName,
        calls,
        errors,
        successRate: calls > 0 ? (((calls - errors) / calls) * 100).toFixed(2) + '%' : 'N/A',
        lastCalled: lastCall ? new Date(lastCall).toISOString() : 'Never',
        timeSinceLastCall: lastCall ? formatDuration(Date.now() - lastCall) : 'N/A',
      };
      
      return { content: [{ type: "text", text: JSON.stringify(usage, null, 2) }] };
    },
  },
  {
    name: "monitoring.reset",
    description:
      "Reset all monitoring metrics. Use with caution as this clears all historical data.",
    schema: { confirm: z.boolean() },
    handler: async (args: any) => {
      const { confirm } = args as { confirm: boolean };
      
      if (!confirm) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Must set confirm=true to reset metrics" }),
          }],
        };
      }
      
      metrics.toolCalls.clear();
      metrics.errors.clear();
      metrics.lastCalls.clear();
      metrics.totalRequests = 0;
      metrics.totalErrors = 0;
      metrics.startTime = Date.now();
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ message: "Metrics reset successfully", timestamp: new Date().toISOString() }),
        }],
      };
    },
  },
  {
    name: "monitoring.health",
    description:
      "Comprehensive health check of the MCP server including uptime, memory usage, and system status.",
    schema: {},
    handler: async () => {
      const uptime = process.uptime();
      const memory = process.memoryUsage();
      
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: {
          seconds: Math.floor(uptime),
          formatted: formatDuration(uptime * 1000),
        },
        memory: {
          heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        },
        node: {
          version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        metrics: {
          totalRequests: metrics.totalRequests,
          errorRate: metrics.totalRequests > 0 
            ? ((metrics.totalErrors / metrics.totalRequests) * 100).toFixed(2) + '%'
            : '0%',
        },
      };
      
      return { content: [{ type: "text", text: JSON.stringify(health, null, 2) }] };
    },
  },
];

/** Format duration in ms to human-readable string */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
