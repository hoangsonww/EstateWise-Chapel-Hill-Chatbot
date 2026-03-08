import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { __langTestUtils } from "../dist/lang/graph.js";
import { __crewTestUtils } from "../dist/crewai/CrewRunner.js";
import {
  __langSmithTestUtils,
  initializeLangSmith,
} from "../dist/lang/langsmith.js";
import { A2AProtocol } from "../dist/a2a/protocol.js";
import { __httpTestUtils } from "../dist/http/server.js";

const LANGSMITH_ENV_KEYS = [
  "LANGSMITH_ENABLED",
  "LANGSMITH_API_KEY",
  "LANGSMITH_STRICT",
  "LANGSMITH_TRACING",
  "LANGSMITH_TRACING_V2",
  "LANGCHAIN_TRACING",
  "LANGCHAIN_TRACING_V2",
  "LANGSMITH_PROJECT",
];

function saveEnv(keys) {
  const snapshot = {};
  for (const key of keys) snapshot[key] = process.env[key];
  return snapshot;
}

function restoreEnv(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("LangGraph prompt utilities", () => {
  it("formats context and instructions", () => {
    const context = { location: "Chapel Hill", budget: { max: 850000 } };
    const prompt = __langTestUtils.buildSystemPrompt(
      "Base",
      context,
      "Focus on schools",
    );
    assert.match(prompt, /Base/);
    assert.match(prompt, /Context:/);
    assert.match(prompt, /location/);
    assert.match(prompt, /Focus on schools/);
  });

  it("serializes plain string context", () => {
    const text = __langTestUtils.serializeContext("Consider recent comps");
    assert.equal(text, "Consider recent comps");
  });
});

describe("CrewAI payload helpers", () => {
  it("builds payload with include defaults and filters empty", () => {
    const payload = __crewTestUtils.buildPayload("Find homes", {
      includeFinance: false,
      hints: ["prefer single-story"],
    });
    assert.equal(payload.goal, "Find homes");
    assert.deepEqual(payload.include, {
      planner: true,
      analysis: true,
      graph: true,
      finance: false,
      reporter: true,
    });
    assert.deepEqual(payload.hints, ["prefer single-story"]);
    assert.ok(!("context" in payload));
  });

  it("extracts structured timeline", () => {
    const json = {
      ok: true,
      summary: "Final report",
      sections: { report: "Report text" },
      timeline: [
        { agent: "Planner", task: "plan", output: "Plan output" },
        { agent: "Reporter", task: "report", output: "Report text" },
      ],
      artifacts: { report: "Report text" },
      metadata: { include: { planner: true } },
    };
    const structured = __crewTestUtils.extractStructured(json);
    assert.ok(structured);
    assert.equal(structured.summary, "Final report");
    assert.equal(structured.report, "Report text");
    assert.equal(structured.timeline.length, 2);
    assert.equal(structured.timeline[0].agent, "Planner");
  });
});

describe("LangSmith utilities", () => {
  const envSnapshot = saveEnv(LANGSMITH_ENV_KEYS);

  beforeEach(() => {
    __langSmithTestUtils.resetLangSmithStateForTests();
    restoreEnv(envSnapshot);
  });

  afterEach(() => {
    __langSmithTestUtils.resetLangSmithStateForTests();
    restoreEnv(envSnapshot);
  });

  it("parses optional booleans", () => {
    assert.equal(__langSmithTestUtils.parseOptionalBool("true"), true);
    assert.equal(__langSmithTestUtils.parseOptionalBool("FALSE"), false);
    assert.equal(__langSmithTestUtils.parseOptionalBool("maybe"), undefined);
  });

  it("sanitizes metadata values into JSON-safe primitives", () => {
    const sanitized = __langSmithTestUtils.sanitizeMetadata({
      env: "prod",
      retries: 2,
      enabled: true,
      nested: { region: "us-east-1" },
    });
    assert.equal(sanitized.env, "prod");
    assert.equal(sanitized.retries, 2);
    assert.equal(sanitized.enabled, true);
    assert.equal(sanitized.nested, JSON.stringify({ region: "us-east-1" }));
  });

  it("flags misconfiguration when tracing enabled without api key", () => {
    process.env.LANGSMITH_ENABLED = "true";
    delete process.env.LANGSMITH_API_KEY;
    const status = initializeLangSmith({
      runtime: "langgraph",
      surface: "http",
    });
    assert.equal(status.enabled, true);
    assert.equal(status.misconfigured, true);
    assert.equal(process.env.LANGSMITH_TRACING_V2, "false");
  });

  it("fails fast when strict mode is enabled without api key", () => {
    process.env.LANGSMITH_ENABLED = "true";
    process.env.LANGSMITH_STRICT = "true";
    delete process.env.LANGSMITH_API_KEY;
    assert.throws(
      () => initializeLangSmith({ runtime: "langgraph", surface: "http" }),
      /LANGSMITH tracing requested but LANGSMITH_API_KEY is missing/,
    );
  });
});

describe("A2A protocol request correlation", () => {
  it("propagates trimmed requestId into task input and execution", async () => {
    let seenInput;
    const protocol = new A2AProtocol(async (input) => {
      seenInput = input;
      return { ok: true };
    });

    const create = await protocol.handleRpc(
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tasks.create",
        params: {
          goal: "Find properties in Chapel Hill",
          runtime: "langgraph",
          rounds: 2,
          requestId: "   req-123   ",
        },
      },
      "http://localhost:4318",
    );

    assert.ok(create && !("error" in create));
    const task = create.result.task;
    assert.equal(task.input.requestId, "req-123");

    const waited = await protocol.handleRpc(
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tasks.wait",
        params: { taskId: task.id, timeoutMs: 3_000 },
      },
      "http://localhost:4318",
    );
    assert.ok(waited && !("error" in waited));
    assert.equal(waited.result.task.status, "succeeded");
    assert.equal(seenInput.requestId, "req-123");
  });

  it("truncates oversized requestId to 128 characters", async () => {
    const protocol = new A2AProtocol(async () => ({ ok: true }));
    const oversized = "x".repeat(140);
    const create = await protocol.handleRpc(
      {
        jsonrpc: "2.0",
        id: 11,
        method: "tasks.create",
        params: { goal: "Find homes", requestId: oversized },
      },
      "http://localhost:4318",
    );

    assert.ok(create && !("error" in create));
    assert.equal(create.result.task.input.requestId.length, 128);
  });
});

describe("HTTP helper parsing", () => {
  it("normalizes requestId and runtime values", () => {
    assert.equal(__httpTestUtils.parseRequestId("   rid-1   "), "rid-1");
    assert.equal(__httpTestUtils.parseRequestId(""), undefined);
    assert.equal(__httpTestUtils.parseRequestId("a".repeat(200)).length, 128);
    assert.equal(__httpTestUtils.parseRuntime("default"), "default");
    assert.throws(
      () => __httpTestUtils.parseRuntime("invalid"),
      /runtime must be one of default\|langgraph\|crewai/,
    );
  });
});
