import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mcpToolset } from "../dist/lang/tools.js";
import { getRequiredToolsForRuntime } from "../dist/mcp/contracts.js";

describe("LangGraph MCP contract alignment", () => {
  it("exposes wrappers for all required langgraph MCP tools", () => {
    const required = getRequiredToolsForRuntime("langgraph");
    const exposed = new Set(
      mcpToolset()
        .map((tool) => String(tool.name || ""))
        .filter((name) => name.startsWith("mcp:"))
        .map((name) => name.slice(4)),
    );
    const missing = required.filter((toolName) => !exposed.has(toolName));
    assert.deepEqual(missing, []);
  });
});
