import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { config } from "../core/config.js";
import { getGovernanceSnapshot } from "../core/governance.js";
import { getMetricsSnapshot, getToolUsage } from "../core/metrics.js";
import { getToolCatalogSnapshot } from "../core/registry.js";

const RESOURCE_URIS = {
  config: "estatewise://server/config",
  tools: "estatewise://server/tools",
  monitoring: "estatewise://server/monitoring",
  governance: "estatewise://server/governance",
} as const;

function asJsonResource(uri: string, data: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function decodeTemplateVar(raw: string | string[] | undefined): string {
  if (!raw) return "";
  if (Array.isArray(raw)) {
    return decodeTemplateVar(raw[0]);
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function registerAllResources(server: McpServer) {
  server.registerResource(
    "server-config",
    RESOURCE_URIS.config,
    {
      title: "EstateWise MCP Config",
      description: "Runtime-safe MCP server configuration values.",
      mimeType: "application/json",
    },
    async () =>
      asJsonResource(RESOURCE_URIS.config, {
        serverName: config.serverName,
        serverVersion: config.serverVersion,
        apiBaseUrl: config.apiBaseUrl,
        frontendBaseUrl: config.frontendBaseUrl,
        a2aBaseUrl: config.a2aBaseUrl,
        a2aTimeoutMs: config.a2aTimeoutMs,
        a2aPollMs: config.a2aPollMs,
        a2aWaitTimeoutMs: config.a2aWaitTimeoutMs,
        webTimeoutMs: config.webTimeoutMs,
        cacheTtlMs: config.cacheTtlMs,
        cacheMax: config.cacheMax,
        debug: config.debug,
      }),
  );

  server.registerResource(
    "server-tools",
    RESOURCE_URIS.tools,
    {
      title: "EstateWise MCP Tool Catalog",
      description:
        "All tool names, descriptions, and normalized schema fields.",
      mimeType: "application/json",
    },
    async () =>
      asJsonResource(RESOURCE_URIS.tools, {
        count: getToolCatalogSnapshot().length,
        tools: getToolCatalogSnapshot(),
      }),
  );

  server.registerResource(
    "server-monitoring",
    RESOURCE_URIS.monitoring,
    {
      title: "EstateWise MCP Monitoring Snapshot",
      description: "Aggregated runtime and tool telemetry.",
      mimeType: "application/json",
    },
    async () =>
      asJsonResource(
        RESOURCE_URIS.monitoring,
        getMetricsSnapshot({ detailed: true }),
      ),
  );

  server.registerResource(
    "server-governance",
    RESOURCE_URIS.governance,
    {
      title: "EstateWise MCP Governance Snapshot",
      description: "Tool execution guardrails and concurrency settings.",
      mimeType: "application/json",
    },
    async () =>
      asJsonResource(RESOURCE_URIS.governance, getGovernanceSnapshot()),
  );

  const toolSchemaTemplate = new ResourceTemplate(
    "estatewise://tool/{name}/schema",
    {
      list: async () => ({
        resources: getToolCatalogSnapshot().map((tool) => ({
          uri: `estatewise://tool/${encodeURIComponent(tool.name)}/schema`,
          name: `tool-schema:${tool.name}`,
          title: `${tool.name} schema`,
          description: tool.description,
          mimeType: "application/json",
        })),
      }),
      complete: {
        name: async (value) =>
          getToolCatalogSnapshot()
            .map((tool) => tool.name)
            .filter((name) => name.toLowerCase().includes(value.toLowerCase()))
            .slice(0, 25),
      },
    },
  );

  server.registerResource(
    "tool-schema-template",
    toolSchemaTemplate,
    {
      title: "Tool Schema by Name",
      description:
        "Read one tool schema using estatewise://tool/{name}/schema.",
      mimeType: "application/json",
    },
    async (_uri, variables) => {
      const name = decodeTemplateVar(variables.name);
      const tool = getToolCatalogSnapshot().find(
        (entry) => entry.name === name,
      );
      const uri = `estatewise://tool/${encodeURIComponent(name)}/schema`;
      return asJsonResource(uri, {
        tool: tool || null,
        found: !!tool,
      });
    },
  );

  const toolUsageTemplate = new ResourceTemplate(
    "estatewise://tool/{name}/usage",
    {
      list: async () => ({
        resources: getToolCatalogSnapshot().map((tool) => ({
          uri: `estatewise://tool/${encodeURIComponent(tool.name)}/usage`,
          name: `tool-usage:${tool.name}`,
          title: `${tool.name} usage`,
          description: `Operational usage stats for ${tool.name}`,
          mimeType: "application/json",
        })),
      }),
      complete: {
        name: async (value) =>
          getToolCatalogSnapshot()
            .map((tool) => tool.name)
            .filter((name) => name.toLowerCase().includes(value.toLowerCase()))
            .slice(0, 25),
      },
    },
  );

  server.registerResource(
    "tool-usage-template",
    toolUsageTemplate,
    {
      title: "Tool Usage by Name",
      description: "Read one tool's latency/error/size metrics.",
      mimeType: "application/json",
    },
    async (_uri, variables) => {
      const name = decodeTemplateVar(variables.name);
      const uri = `estatewise://tool/${encodeURIComponent(name)}/usage`;
      return asJsonResource(uri, getToolUsage(name));
    },
  );
}
