import { z } from "zod";
import { config } from "../core/config.js";
import { httpCacheClear, httpGetCached as httpGet, qs } from "../core/http.js";
import { getGovernanceSnapshot } from "../core/governance.js";
import { getMetricsSnapshot } from "../core/metrics.js";
import { getToolCatalogSnapshot } from "../core/registry.js";
import type { ToolDef } from "../core/registry.js";

/** System and diagnostics tools for MCP server. */
export const systemTools: ToolDef[] = [
  {
    name: "system.config",
    description: "Return MCP server configuration (safe values).",
    schema: {},
    handler: async () => {
      const safe = {
        apiBaseUrl: config.apiBaseUrl,
        frontendBaseUrl: config.frontendBaseUrl,
        a2aBaseUrl: config.a2aBaseUrl,
        a2aTimeoutMs: config.a2aTimeoutMs,
        webTimeoutMs: config.webTimeoutMs,
        cacheTtlMs: config.cacheTtlMs,
        cacheMax: config.cacheMax,
        toolTimeoutMs: config.toolTimeoutMs,
        toolMaxArgBytes: config.toolMaxArgBytes,
        toolMaxConcurrent: config.toolMaxConcurrent,
        tokenRequireSecret: config.tokenRequireSecret,
        tokenPersistPath: config.tokenPersistPath || null,
        liveDataSnapshotPath: config.liveDataSnapshotPath,
        liveDataMaxResults: config.liveDataMaxResults,
      };
      return { content: [{ type: "text", text: JSON.stringify(safe) }] };
    },
  },
  {
    name: "system.time",
    description: "Return current server time in ISO format.",
    schema: {},
    handler: async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ now: new Date().toISOString() }),
          },
        ],
      };
    },
  },
  {
    name: "system.health",
    description:
      "Check backend health by issuing a low-impact properties request.",
    schema: { q: z.string().default("homes"), topK: z.number().default(1) },
    handler: async (args: any) => {
      const { q, topK } = args as { q?: string; topK?: number };
      try {
        const data = await httpGet(`/api/properties${qs({ q, topK })}`);
        const ok =
          Array.isArray((data as any)?.results) ||
          Array.isArray((data as any)?.properties);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok,
                sample: ok
                  ? (data as any).results?.slice?.(0, 1) ||
                    (data as any).properties?.slice?.(0, 1)
                  : null,
              }),
            },
          ],
        };
      } catch (e: any) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                ok: false,
                error: e?.message || String(e),
              }),
            },
          ],
        };
      }
    },
  },
  {
    name: "system.tools",
    description: "List registered tool names and descriptions.",
    schema: {},
    handler: async () => {
      const tools = getToolCatalogSnapshot();
      return { content: [{ type: "text", text: JSON.stringify({ tools }) }] };
    },
  },
  {
    name: "system.toolSchema",
    description:
      "Return a normalized schema summary for one tool by name (fields + required).",
    schema: { name: z.string() },
    handler: async (args: any) => {
      const { name } = args as { name: string };
      const tool = getToolCatalogSnapshot().find(
        (entry) => entry.name === name,
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              tool: tool || null,
              found: !!tool,
            }),
          },
        ],
      };
    },
  },
  {
    name: "system.capabilities",
    description:
      "Return MCP server capabilities and operational guardrails for clients and operators.",
    schema: {},
    handler: async () => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              server: {
                name: config.serverName,
                version: config.serverVersion,
              },
              capabilities: {
                tools: { listChanged: true },
                resources: { listChanged: true, subscribe: true },
                prompts: { listChanged: true },
                logging: {},
              },
              governance: getGovernanceSnapshot(),
              metrics: getMetricsSnapshot({ detailed: false }).summary,
            }),
          },
        ],
      };
    },
  },
  {
    name: "system.cache.clear",
    description: "Clear HTTP response cache (GET).",
    schema: {},
    handler: async () => {
      httpCacheClear();
      return {
        content: [{ type: "text", text: JSON.stringify({ ok: true }) }],
      };
    },
  },
];
