import { z } from "zod";
import type { ToolDef } from "../core/registry.js";
import { getGovernanceSnapshot } from "../core/governance.js";
import {
  getMetricsSnapshot,
  getToolUsage,
  resetMetrics,
} from "../core/metrics.js";

/**
 * Monitoring & metrics tools for tracking MCP server usage and performance.
 */

export const monitoringTools: ToolDef[] = [
  {
    name: "monitoring.stats",
    description:
      "Get comprehensive statistics about MCP server usage including call counts, error rates, and performance metrics.",
    schema: { detailed: z.boolean().optional() },
    handler: async (args: any) => {
      const { detailed = false } = args as { detailed?: boolean };
      const stats = {
        ...getMetricsSnapshot({ detailed }),
        governance: getGovernanceSnapshot(),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      };
    },
  },
  {
    name: "monitoring.toolUsage",
    description:
      "Get usage statistics for a specific tool including call count, error rate, and last called time.",
    schema: { toolName: z.string() },
    handler: async (args: any) => {
      const { toolName } = args as { toolName: string };
      const usage = getToolUsage(toolName);

      return {
        content: [{ type: "text", text: JSON.stringify(usage, null, 2) }],
      };
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
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Must set confirm=true to reset metrics",
              }),
            },
          ],
        };
      }

      resetMetrics();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              message: "Metrics reset successfully",
              timestamp: new Date().toISOString(),
            }),
          },
        ],
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
      const metrics = getMetricsSnapshot({ detailed: false }).summary;

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
          totalErrors: metrics.totalErrors,
          successRatePct: Number(metrics.successRatePct.toFixed(2)),
        },
        governance: getGovernanceSnapshot(),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(health, null, 2) }],
      };
    },
  },
];

/** Format duration in ms to human-readable string. */
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
