import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  Supervisor,
  createDefaultRegistry,
  AgentErrorType,
} from "../dist/orchestration/index.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSupervisor(overrides = {}) {
  return new Supervisor({
    registry: createDefaultRegistry(),
    maxBudgetUsd: 1.0,
    maxPlanSteps: 10,
    timeoutMs: 30_000,
    ...overrides,
  });
}

function mockExecuteAgent(results = {}) {
  return async (agentId, _task) => {
    if (results[agentId]) return results[agentId];
    return {
      success: true,
      data: `Result from ${agentId}`,
      metadata: {
        taskId: "test",
        agentId,
        status: "completed",
        createdAt: Date.now(),
        attempt: 1,
        inputTokens: 100,
        outputTokens: 50,
        costUsd: 0.001,
        durationMs: 200,
      },
      toolCalls: [],
    };
  };
}

// ---------------------------------------------------------------------------
// Intent Classification
// ---------------------------------------------------------------------------

describe("Supervisor — Intent Classification", () => {
  const sup = makeSupervisor();

  it("classifies property search intent", () => {
    const result = sup.classifyIntent("Find 3-bed homes in Chapel Hill under $500,000");
    assert.equal(result.intent, "property-search");
    assert.ok(result.confidence > 0);
    assert.ok(result.confidence <= 0.99);
    assert.ok(result.suggestedAgents.includes("property-search"));
  });

  it("classifies market analysis intent", () => {
    const result = sup.classifyIntent("What are the market trends in Durham?");
    assert.equal(result.intent, "market-analysis");
    assert.equal(result.requiresMultiStep, true);
  });

  it("classifies property comparison intent", () => {
    const result = sup.classifyIntent("Compare these two properties side by side");
    assert.equal(result.intent, "property-comparison");
    assert.equal(result.requiresMultiStep, true);
  });

  it("classifies recommendation intent", () => {
    const result = sup.classifyIntent("What would you recommend for a first-time buyer?");
    assert.equal(result.intent, "recommendation");
  });

  it("classifies financial analysis intent", () => {
    const result = sup.classifyIntent("Can I afford a $400,000 home with a $80,000 down payment?");
    assert.equal(result.intent, "financial-analysis");
  });

  it("classifies neighborhood info intent", () => {
    const result = sup.classifyIntent("Tell me about schools near downtown Chapel Hill");
    assert.equal(result.intent, "neighborhood-info");
  });

  it("classifies greeting intent", () => {
    const result = sup.classifyIntent("Hello, what can you help me with?");
    assert.equal(result.intent, "greeting");
    assert.equal(result.requiresMultiStep, false);
  });

  it("falls back to greeting for gibberish", () => {
    const result = sup.classifyIntent("asdfghjkl");
    assert.equal(result.intent, "greeting");
  });

  it("extracts location entities", () => {
    const result = sup.classifyIntent("Find homes in Chapel Hill, NC");
    assert.ok(result.entities.locations.length > 0);
  });

  it("extracts price range entities", () => {
    const result = sup.classifyIntent("Show me homes from $300,000 to $500,000");
    assert.ok(result.entities.prices.length > 0);
    const price = result.entities.prices[0];
    assert.equal(price.min, 300000);
    assert.equal(price.max, 500000);
  });

  it("extracts upper price bound", () => {
    const result = sup.classifyIntent("Find homes under $400,000");
    assert.ok(result.entities.prices.length > 0);
    assert.equal(result.entities.prices[0].max, 400000);
  });

  it("extracts lower price bound", () => {
    const result = sup.classifyIntent("Show me homes over $250,000");
    assert.ok(result.entities.prices.length > 0);
    assert.equal(result.entities.prices[0].min, 250000);
  });

  it("extracts property type entities", () => {
    const result = sup.classifyIntent("Find condos for sale");
    assert.ok(result.entities.propertyTypes.includes("condo"));
  });

  it("extracts feature entities", () => {
    const result = sup.classifyIntent("Find a 3 bed 2 bath home with a pool");
    assert.ok(result.entities.features.includes("3-bed"));
    assert.ok(result.entities.features.includes("2-bath"));
    assert.ok(result.entities.features.includes("pool"));
  });

  it("confidence is bounded between 0 and 0.99", () => {
    const greetingConf = sup.classifyIntent("hello").confidence;
    const searchConf = sup.classifyIntent(
      "find search look for show me listing available homes for sale houses",
    ).confidence;
    assert.ok(greetingConf >= 0);
    assert.ok(greetingConf <= 0.99);
    assert.ok(searchConf >= 0);
    assert.ok(searchConf <= 0.99);
  });
});

// ---------------------------------------------------------------------------
// Execution Plan Building
// ---------------------------------------------------------------------------

describe("Supervisor — Plan Building", () => {
  const sup = makeSupervisor();

  it("builds single-turn plan for simple intents", () => {
    const intent = sup.classifyIntent("Hello");
    const plan = sup.buildExecutionPlan(intent, "Hello");
    assert.equal(plan.mode, "single_turn");
    assert.ok(plan.steps.length >= 1);
  });

  it("builds agentic plan for multi-step intents", () => {
    const intent = sup.classifyIntent("Compare market trends and recommend properties");
    const plan = sup.buildExecutionPlan(intent, "Compare market trends and recommend");
    assert.equal(plan.mode, "agentic");
    assert.ok(plan.steps.length >= 2);
  });

  it("plan steps have valid structure", () => {
    const intent = sup.classifyIntent("Find homes in Chapel Hill");
    const plan = sup.buildExecutionPlan(intent, "Find homes in Chapel Hill");
    for (const step of plan.steps) {
      assert.ok(step.stepId);
      assert.ok(step.agentId);
      assert.ok(step.taskDescription);
      assert.ok(typeof step.estimatedCostUsd === "number");
      assert.ok(typeof step.priority === "number");
      assert.ok(Array.isArray(step.dependencies));
      assert.equal(step.status, "pending");
    }
  });

  it("multi-step plans have sequential dependencies", () => {
    const intent = sup.classifyIntent("Analyze the market and give me recommendations");
    const plan = sup.buildExecutionPlan(intent, "Analyze market and recommend");
    if (plan.steps.length >= 2) {
      // Second step should depend on first step
      assert.ok(plan.steps[1].dependencies.length > 0);
    }
  });

  it("adds quality reviewer for multi-step plans", () => {
    const intent = sup.classifyIntent("Compare these properties and analyze the market");
    const plan = sup.buildExecutionPlan(intent, "Compare and analyze");
    const reviewStep = plan.steps.find((s) => s.agentId === "quality-reviewer");
    if (reviewStep) {
      assert.ok(reviewStep.optional);
      assert.ok(reviewStep.dependencies.length > 0);
    }
  });

  it("plan has valid cost estimate", () => {
    const intent = sup.classifyIntent("Find homes in Chapel Hill");
    const plan = sup.buildExecutionPlan(intent, "Find homes");
    assert.ok(plan.totalEstimatedCostUsd > 0);
    assert.ok(plan.totalEstimatedCostUsd < 1.0);
  });

  it("respects maxPlanSteps", () => {
    const sup2 = makeSupervisor({ maxPlanSteps: 1 });
    const intent = sup2.classifyIntent("Compare these properties and analyze market trends");
    const plan = sup2.buildExecutionPlan(intent, "Compare and analyze");
    // Should have at most maxPlanSteps + 1 (for quality reviewer)
    assert.ok(plan.steps.length <= 2);
  });
});

// ---------------------------------------------------------------------------
// Budget Optimization
// ---------------------------------------------------------------------------

describe("Supervisor — Budget Optimization", () => {
  it("optimizes plan for tight budget", () => {
    const sup = makeSupervisor({ maxBudgetUsd: 0.0001 });
    const intent = sup.classifyIntent("Analyze market trends in Chapel Hill");
    const plan = sup.buildExecutionPlan(intent, "Analyze market");
    const optimized = sup.optimizePlanForBudget(plan);
    assert.ok(optimized.totalEstimatedCostUsd <= plan.totalEstimatedCostUsd);
  });
});

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

describe("Supervisor — Plan Execution", () => {
  it("executes single-step plan successfully", async () => {
    const sup = makeSupervisor();
    const intent = sup.classifyIntent("Hello");
    const plan = sup.buildExecutionPlan(intent, "Hello");
    const results = await sup.executePlan(plan, mockExecuteAgent());
    assert.ok(results.size > 0);
    for (const [, result] of results) {
      assert.equal(result.success, true);
    }
  });

  it("executes multi-step plan with dependencies", async () => {
    const sup = makeSupervisor();
    const intent = sup.classifyIntent("Analyze market and recommend properties");
    const plan = sup.buildExecutionPlan(intent, "Analyze and recommend");
    const results = await sup.executePlan(plan, mockExecuteAgent());
    assert.ok(results.size >= 2);
  });

  it("handles agent failure gracefully", async () => {
    const sup = makeSupervisor();
    const intent = sup.classifyIntent("Find homes in Chapel Hill");
    const plan = sup.buildExecutionPlan(intent, "Find homes");
    const failExecute = async () => {
      throw new Error("Agent crashed");
    };
    const results = await sup.executePlan(plan, failExecute);
    for (const [, result] of results) {
      assert.equal(result.success, false);
    }
  });

  it("cancels downstream steps when dependency fails", async () => {
    const sup = makeSupervisor();
    const intent = sup.classifyIntent("Compare properties and analyze market");
    const plan = sup.buildExecutionPlan(intent, "Compare and analyze");

    if (plan.steps.length < 2) return; // Skip if plan is too simple

    // Make first agent fail
    const firstAgentId = plan.steps[0].agentId;
    const failFirst = async (agentId, _task) => {
      if (agentId === firstAgentId) throw new Error("First agent failed");
      return {
        success: true,
        data: "ok",
        metadata: { taskId: "t", agentId, status: "completed", createdAt: Date.now(), attempt: 1, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 },
        toolCalls: [],
      };
    };

    const results = await sup.executePlan(plan, failFirst);
    // Check that dependent steps got cancelled
    for (const step of plan.steps) {
      if (step.dependencies.includes(plan.steps[0].stepId)) {
        assert.equal(step.status, "cancelled");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Response Synthesis
// ---------------------------------------------------------------------------

describe("Supervisor — Response Synthesis", () => {
  it("synthesizes successful results", () => {
    const sup = makeSupervisor();
    const intent = sup.classifyIntent("Find homes");
    const results = new Map();
    results.set("step1", {
      success: true,
      data: "Found 3 homes in Chapel Hill",
      metadata: { taskId: "t", agentId: "property-search", status: "completed", createdAt: Date.now(), attempt: 1, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 },
      toolCalls: [],
    });
    const response = sup.synthesizeResponse(intent, results);
    assert.ok(response.includes("Found 3 homes"));
  });

  it("synthesizes error results", () => {
    const sup = makeSupervisor();
    const intent = sup.classifyIntent("Find homes");
    const results = new Map();
    results.set("step1", {
      success: false,
      error: { message: "API unavailable", type: AgentErrorType.EXTERNAL_API_FAILURE },
      metadata: { taskId: "t", agentId: "property-search", status: "failed", createdAt: Date.now(), attempt: 1, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 },
      toolCalls: [],
    });
    const response = sup.synthesizeResponse(intent, results);
    assert.ok(response.includes("issues"));
  });

  it("returns fallback message on empty results", () => {
    const sup = makeSupervisor();
    const intent = sup.classifyIntent("Find homes");
    const response = sup.synthesizeResponse(intent, new Map());
    assert.ok(response.includes("rephrasing"));
  });
});

// ---------------------------------------------------------------------------
// Full handleRequest flow
// ---------------------------------------------------------------------------

describe("Supervisor — Full Request Flow", () => {
  it("handles complete request end-to-end", async () => {
    const sup = makeSupervisor();
    const result = await sup.handleRequest(
      "Find 3-bed homes in Chapel Hill under $500,000",
      mockExecuteAgent(),
    );
    assert.ok(result.intent);
    assert.equal(result.intent.intent, "property-search");
    assert.ok(result.plan);
    assert.ok(result.synthesizedResponse.length > 0);
    assert.ok(result.totalDurationMs >= 0);
    assert.ok(typeof result.totalCostUsd === "number");
  });
});
