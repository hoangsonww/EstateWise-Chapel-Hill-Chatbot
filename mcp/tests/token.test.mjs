import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const persistPath = path.join(
  os.tmpdir(),
  `estatewise-mcp-token-${Date.now()}.json`,
);

describe("MCP token lifecycle", () => {
  before(() => {
    process.env.MCP_TOKEN_SECRET = "unit-test-secret";
    process.env.MCP_TOKEN_REQUIRE_SECRET = "true";
    process.env.MCP_TOKEN_PERSIST_PATH = persistPath;
  });

  after(() => {
    delete process.env.MCP_TOKEN_SECRET;
    delete process.env.MCP_TOKEN_REQUIRE_SECRET;
    delete process.env.MCP_TOKEN_PERSIST_PATH;
    if (fs.existsSync(persistPath)) fs.unlinkSync(persistPath);
  });

  it("generates and validates access tokens", async () => {
    const mod = await import("../dist/core/token.js");
    const token = mod.generateMCPToken("subject-1", ["read:properties"]);
    const payload = mod.validateMCPToken(token.token);
    assert.ok(payload);
    assert.equal(payload.sub, "subject-1");
  });

  it("persists token state when MCP_TOKEN_PERSIST_PATH is set", async () => {
    const mod = await import("../dist/core/token.js");
    mod.generateMCPToken("persisted-subject");
    assert.equal(fs.existsSync(persistPath), true);
    const persisted = JSON.parse(fs.readFileSync(persistPath, "utf8"));
    assert.ok(Array.isArray(persisted.tokens));
    assert.ok(persisted.tokens.length >= 1);
  });

  it("enforces secret requirement when strict mode is enabled", () => {
    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import { generateMCPToken } from './dist/core/token.js'; try { generateMCPToken('blocked'); console.log('allowed'); } catch (error) { console.log(String(error.message)); }",
      ],
      {
        cwd: path.resolve(process.cwd()),
        env: {
          ...process.env,
          MCP_TOKEN_REQUIRE_SECRET: "true",
          MCP_TOKEN_SECRET: "",
        },
      },
    )
      .toString()
      .trim();
    assert.match(output, /MCP_TOKEN_SECRET is required/);
  });

  it("does not crash module initialization on malformed persisted token state", () => {
    const malformedPath = path.join(
      os.tmpdir(),
      `estatewise-mcp-token-malformed-${Date.now()}.json`,
    );
    fs.writeFileSync(malformedPath, "{invalid-json", "utf8");

    const output = execFileSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import './dist/core/token.js'; console.log('token-module-ok');",
      ],
      {
        cwd: path.resolve(process.cwd()),
        env: {
          ...process.env,
          MCP_TOKEN_SECRET: "unit-test-secret",
          MCP_TOKEN_REQUIRE_SECRET: "true",
          MCP_TOKEN_PERSIST_PATH: malformedPath,
        },
      },
    )
      .toString()
      .trim();

    assert.match(output, /token-module-ok/);

    if (fs.existsSync(malformedPath)) fs.unlinkSync(malformedPath);
  });
});
