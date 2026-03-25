import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultRegistry, AgentError, AgentErrorType, ErrorRecoveryEngine, HandoffManager, CostBudgetManager, DeadLetterQueue, RoutingStrategy, BatchProcessor } from '../dist/orchestration/index.js';

describe('Agent Registry', () => {
  it('should create default registry with all agents', () => {
    assert.ok(createDefaultRegistry().listAll().length >= 9);
  });
  it('should find agents by capability', () => {
    assert.ok(createDefaultRegistry().findAgentsByCapability('property-search').length >= 1);
  });
  it('should find cheapest capable agent', () => {
    const c = createDefaultRegistry().findCheapestCapableAgent('property-search');
    assert.ok(c);
  });
  it('should resolve fallback chains', () => {
    const chain = createDefaultRegistry().resolveFallbackChain('property-search');
    assert.ok(chain.length >= 2);
  });
  it('should track metrics on success', () => {
    const r = createDefaultRegistry();
    r.recordSuccess('property-search', 1000, 500, 200, 0.01);
    const m = r.getMetrics('property-search');
    assert.equal(m.totalRequests, 1);
    assert.equal(m.successCount, 1);
  });
  it('should open circuit breaker after failures', () => {
    const r = createDefaultRegistry();
    r.recordFailure('property-search');
    r.recordFailure('property-search');
    r.recordFailure('property-search');
    assert.equal(r.getCircuitBreakerState('property-search'), 'OPEN');
    assert.equal(r.isHealthy('property-search'), false);
  });
  it('should find healthy fallback', () => {
    const r = createDefaultRegistry();
    r.recordFailure('property-search');
    r.recordFailure('property-search');
    r.recordFailure('property-search');
    const fb = r.findHealthyFallback('property-search');
    assert.ok(fb);
  });
});

describe('Error Recovery', () => {
  it('should backoff for rate limited', () => {
    const e = new ErrorRecoveryEngine();
    const a = e.getRecoveryAction({ error: new AgentError({ type: AgentErrorType.RATE_LIMITED, message: 'x', agentId: 't' }), attempt: 0, previousRecoveries: [] });
    assert.equal(a.strategy, 'ExponentialBackoff');
  });
  it('should degrade for budget exceeded', () => {
    const a = new ErrorRecoveryEngine().getRecoveryAction({ error: new AgentError({ type: AgentErrorType.BUDGET_EXCEEDED, message: 'x', agentId: 't' }), attempt: 0, previousRecoveries: [] });
    assert.equal(a.strategy, 'DegradeToHaiku');
  });
  it('should abort on circular handoff', () => {
    const a = new ErrorRecoveryEngine().getRecoveryAction({ error: new AgentError({ type: AgentErrorType.CIRCULAR_HANDOFF, message: 'x', agentId: 't' }), attempt: 0, previousRecoveries: [] });
    assert.equal(a.strategy, 'AbortWithContext');
  });
});

describe('Cost Budget Manager', () => {
  it('should enforce limits', () => {
    const b = new CostBudgetManager({ sessionLimitUsd: 1 });
    b.recordCost(0.5);
    assert.equal(b.canAfford(0.3), true);
    assert.equal(b.canAfford(0.6), false);
  });
  it('should suggest downgrades when over budget', () => {
    const b = new CostBudgetManager({ sessionLimitUsd: 0.001 });
    b.recordCost(0.001);
    const suggested = b.suggestDowngrade('opus', 10000, 5000);
    assert.equal(suggested, 'haiku');
  });
});

describe('Dead Letter Queue', () => {
  it('should enqueue and stats', () => {
    const d = new DeadLetterQueue();
    d.enqueue({ taskId: 't1', agentId: 'a', input: 'query', error: new AgentError({ type: AgentErrorType.TIMEOUT, message: 'to', agentId: 'a' }), attempts: 3 });
    assert.equal(d.list().length, 1);
  });
});

describe('Routing Strategy', () => {
  it('should route simple to single-turn', () => {
    const r = new RoutingStrategy();
    const d = r.evaluate({ toolCount: 1, intentConfidence: 0.95, conversationDepth: 0, dataDependencies: 0, ambiguityLevel: 0 });
    assert.equal(d.mode, 'single_turn');
  });
  it('should route complex to agentic', () => {
    const r = new RoutingStrategy();
    const d = r.evaluate({ toolCount: 5, intentConfidence: 0.3, conversationDepth: 10, dataDependencies: 5, ambiguityLevel: 0.9 });
    assert.equal(d.mode, 'agentic');
  });
});

describe('Batch Processor', () => {
  it('should process jobs', async () => {
    const p = new BatchProcessor();
    const j = p.createJob(['input1', 'input2']);
    const makeResult = (input) => ({ success: true, data: input, metadata: { taskId: 't', agentId: 'a', status: 'completed', createdAt: Date.now(), attempt: 1, inputTokens: 0, outputTokens: 0, costUsd: 0, durationMs: 0 }, toolCalls: [] });
    const d = await p.processJob(j.jobId, async (input) => makeResult(input));
    assert.equal(d.status, 'completed');
  });
});
