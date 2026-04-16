import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ContentBlock } from "@modelcontextprotocol/sdk/types.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Simple MCP client example that spawns the local server (dist/server.js)
// and demonstrates listing tools and calling one.
// Gives you an idea/example of how to use the MCP client API in your project.

/** Convert `import.meta.url` to a dirname path. */
function dirnameFromImportMeta(url: string) {
  return path.dirname(fileURLToPath(url));
}

/** Forward MCP-relevant env vars to spawned local server. */
function buildForwardedEnv() {
  const forwarded: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value !== "string") continue;
    if (
      key.startsWith("MCP_") ||
      key.startsWith("LIVE_ZILLOW_") ||
      key === "API_BASE_URL" ||
      key === "FRONTEND_BASE_URL" ||
      key === "A2A_BASE_URL" ||
      key === "WEB_TIMEOUT_MS"
    ) {
      forwarded[key] = value;
    }
  }
  return forwarded;
}

/** Render an MCP content block into a human-readable string. */
function renderContentBlock(
  block: ContentBlock,
  opts?: { parseJsonText?: boolean },
): string {
  const parseJsonText = !!opts?.parseJsonText;
  switch (block.type) {
    case "text":
      if (parseJsonText) {
        try {
          const obj = JSON.parse(block.text);
          return JSON.stringify(obj, null, 2);
        } catch {
          // fall through to raw text if not JSON
        }
      }
      return block.text;
    case "image":
      return `[image ${block.mimeType}, ${block.data.length} bytes base64]`;
    case "audio":
      return `[audio ${block.mimeType}, ${block.data.length} bytes base64]`;
    case "resource":
      if ("text" in block.resource) {
        return `[resource text ${block.resource.uri}]\n${block.resource.text}`;
      }
      if ("blob" in block.resource) {
        return `[resource blob ${block.resource.uri}, ${block.resource.blob.length} bytes base64]`;
      }
      return JSON.stringify(block.resource);
    case "resource_link":
      return `[resource link ${block.uri}]`;
    default:
      return JSON.stringify(block);
  }
}

/**
 * Minimal interactive MCP client.
 * - `list` prints tools
 * - `call <tool> <jsonArgs>` invokes a tool
 * - `resources` lists resources/templates
 * - `resource <uri>` reads one resource
 * - `prompts` lists prompts
 * - `prompt <name> <jsonArgs?>` gets one prompt
 * Default demo lists then calls `properties.search`.
 */
async function main() {
  const __dirname = dirnameFromImportMeta(import.meta.url);
  const distDir =
    path.basename(__dirname) === "dist"
      ? __dirname
      : path.join(__dirname, "..", "dist");
  // Spawn the built server from the same dist/ directory as the client.
  // Ensure you've run `npm run build` first.
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["server.js"],
    cwd: distDir, // ensure we spawn from dist/
    env: buildForwardedEnv(),
    stderr: "inherit",
  });

  const client = new Client({
    name: "estatewise-mcp-client",
    version: "0.1.0",
  });
  await client.connect(transport);
  try {
    const [, , cmd, ...rest] = process.argv;

    if (cmd === "list") {
      const tools = await client.listTools();
      // eslint-disable-next-line no-console
      console.log("Available tools:");
      for (const t of tools.tools) {
        // eslint-disable-next-line no-console
        console.log(`- ${t.name}${t.description ? `: ${t.description}` : ""}`);
      }
      return;
    }

    if (cmd === "call") {
      const parseFlagIndex = rest.indexOf("--parse");
      const parseJson = parseFlagIndex !== -1;
      if (parseFlagIndex !== -1) rest.splice(parseFlagIndex, 1);
      const name = rest[0];
      const argsJson = rest[1];
      if (!name)
        throw new Error(
          "Usage: node dist/client.js call <toolName> <jsonArgs>",
        );
      const args = argsJson ? JSON.parse(argsJson) : {};
      const result = await client.callTool({ name, arguments: args });
      if ("content" in result && Array.isArray(result.content)) {
        // eslint-disable-next-line no-console
        console.log(`Result from ${name}:`);
        for (const c of result.content) {
          // eslint-disable-next-line no-console
          console.log(renderContentBlock(c, { parseJsonText: parseJson }));
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(result, null, 2));
      }
      return;
    }

    if (cmd === "resources") {
      const [resources, templates] = await Promise.all([
        client.listResources(),
        client.listResourceTemplates(),
      ]);
      // eslint-disable-next-line no-console
      console.log("Resources:");
      for (const r of resources.resources) {
        // eslint-disable-next-line no-console
        console.log(`- ${r.uri}${r.name ? ` (${r.name})` : ""}`);
      }
      // eslint-disable-next-line no-console
      console.log("\nResource Templates:");
      for (const t of templates.resourceTemplates) {
        // eslint-disable-next-line no-console
        console.log(`- ${t.uriTemplate}${t.name ? ` (${t.name})` : ""}`);
      }
      return;
    }

    if (cmd === "resource") {
      const uri = rest[0];
      if (!uri) throw new Error("Usage: node dist/client.js resource <uri>");
      const result = await client.readResource({ uri });
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    if (cmd === "prompts") {
      const prompts = await client.listPrompts();
      // eslint-disable-next-line no-console
      console.log("Prompts:");
      for (const p of prompts.prompts) {
        // eslint-disable-next-line no-console
        console.log(`- ${p.name}${p.description ? `: ${p.description}` : ""}`);
      }
      return;
    }

    if (cmd === "prompt") {
      const name = rest[0];
      const argsJson = rest[1];
      if (!name)
        throw new Error(
          "Usage: node dist/client.js prompt <name> <jsonArgsOptional>",
        );
      const args = argsJson ? JSON.parse(argsJson) : {};
      const result = await client.getPrompt({ name, arguments: args });
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    // Default demo: list tools, then call a sample
    const tools = await client.listTools();
    // eslint-disable-next-line no-console
    console.log("Available tools:");
    for (const t of tools.tools) {
      // eslint-disable-next-line no-console
      console.log(`- ${t.name}`);
    }

    // Example: call properties.search
    try {
      const result = await client.callTool({
        name: "properties.search",
        arguments: { q: "3 bed in Chapel Hill", topK: 3 },
      });
      // eslint-disable-next-line no-console
      console.log("\nDemo: properties.search result:");
      if ("content" in result && Array.isArray(result.content)) {
        for (const c of result.content)
          console.log(renderContentBlock(c, { parseJsonText: true }));
      } else {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("properties.search failed:", (err as Error).message);
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Client error:", err);
  process.exit(1);
});
