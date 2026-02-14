import { z } from "zod";
import { config } from "../core/config.js";
import { httpCacheClear, httpGetCached as httpGet, qs } from "../core/http.js";
import { catalog } from "../core/registry.js";
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
      const tools = catalog.map((t) => ({
        name: t.name,
        description: t.description,
      }));
      return { content: [{ type: "text", text: JSON.stringify({ tools }) }] };
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
