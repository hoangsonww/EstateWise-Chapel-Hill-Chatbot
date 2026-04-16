import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("Ranking policy engine", () => {
  const originalConfig = process.env.AGENT_POLICY_CONFIG;
  const originalConfigPath = process.env.AGENT_POLICY_CONFIG_PATH;
  const originalWarn = console.warn;

  beforeEach(() => {
    process.env.AGENT_POLICY_CONFIG = JSON.stringify({
      version: "test-policy",
      maxBoost: 100,
      maxSponsoredTop10: 2,
      allowInjection: true,
      campaigns: [
        { id: "s1", zpid: 4, boost: 80, reason: "sponsored" },
        { id: "s2", zpid: 5, boost: 70, reason: "sponsored" },
      ],
    });
    delete process.env.AGENT_POLICY_CONFIG_PATH;
    console.warn = () => {};
  });

  afterEach(() => {
    if (originalConfig === undefined) delete process.env.AGENT_POLICY_CONFIG;
    else process.env.AGENT_POLICY_CONFIG = originalConfig;
    if (originalConfigPath === undefined)
      delete process.env.AGENT_POLICY_CONFIG_PATH;
    else process.env.AGENT_POLICY_CONFIG_PATH = originalConfigPath;
    console.warn = originalWarn;
  });

  it("applies sponsored boosts and preserves disclosures", async () => {
    const mod = await import(
      `../dist/orchestrator/policy-engine.js?t=${Date.now()}`
    );
    mod.__policyTestUtils.resetCache();
    const result = mod.applyRankingPolicy([1, 2, 3]);
    assert.equal(result.version, "test-policy");
    assert.ok(result.adjustedZpids.includes(4));
    assert.ok(result.applied.length >= 1);
    assert.ok(result.disclosures.length >= 1);
  });

  it("falls back to default policy when AGENT_POLICY_CONFIG has invalid JSON", async () => {
    process.env.AGENT_POLICY_CONFIG = "{invalid-json";
    const mod = await import(
      `../dist/orchestrator/policy-engine.js?t=${Date.now()}`
    );
    mod.__policyTestUtils.resetCache();
    const result = mod.applyRankingPolicy([1, 2, 3]);
    assert.equal(result.version, "policy-v1");
    assert.deepEqual(result.adjustedZpids, [1, 2, 3]);
  });

  it("falls back to default policy when AGENT_POLICY_CONFIG_PATH file is malformed", async () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "policy-"));
    const badPath = path.join(tmpDir, "bad-policy.json");
    fs.writeFileSync(badPath, "{broken", "utf8");
    process.env.AGENT_POLICY_CONFIG_PATH = badPath;
    delete process.env.AGENT_POLICY_CONFIG;

    const mod = await import(
      `../dist/orchestrator/policy-engine.js?t=${Date.now()}`
    );
    mod.__policyTestUtils.resetCache();
    const result = mod.applyRankingPolicy([7, 8]);
    assert.equal(result.version, "policy-v1");
    assert.deepEqual(result.adjustedZpids, [7, 8]);

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
