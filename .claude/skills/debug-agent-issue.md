# Skill: Debug Agent Issue

Systematic debugging guide for agentic-ai orchestration issues using traces, metrics, DLQ, and circuit breakers.

## When to Use

Use when an agent request fails, returns incorrect results, times out, or exhibits unexpected routing behavior.

## Step-by-Step Debugging

### 1. Check Traces

Look at the most recent trace spans to identify where the failure occurred:

```bash
cd agentic-ai && node -e "
const { Tracer } = require('./dist/observability/index.js');
const tracer = new Tracer();
const spans = tracer.getRecentSpans?.() || [];
for (const s of spans.slice(-10)) {
  console.log(s.name, s.status, s.duration + 'ms');
}
"
```

Key things to look for:
- Spans with `status: "error"` -- these are the failure points
- Unusually long durations -- may indicate timeouts
- Missing child spans -- the agent may have crashed before completing

### 2. Check Metrics

Export current metrics to see counters and histograms:

```bash
cd agentic-ai && node -e "
const { MetricsRegistry } = require('./dist/observability/index.js');
const registry = new MetricsRegistry();
console.log(JSON.stringify(registry.export(), null, 2));
"
```

Look for:
- `agent_requests_total` with `status: "error"` -- how many failures
- `agent_request_duration_ms` -- p99 latency spikes
- `cost_usd_total` -- budget exhaustion

### 3. Check Dead-Letter Queue

Failed tasks land in the DLQ. Inspect them:

```bash
cd agentic-ai && node -e "
const { DeadLetterQueue } = require('./dist/orchestration/index.js');
const dlq = new DeadLetterQueue();
const items = dlq.retrieve?.() || [];
console.log('DLQ items:', items.length);
for (const item of items.slice(-5)) {
  console.log('  -', item.reason, item.originalTask?.type);
}
"
```

DLQ items contain:
- `reason` -- why the task failed
- `originalTask` -- the task that was attempted
- `timestamp` -- when it failed
- `retryCount` -- how many retries were attempted

### 4. Check Circuit Breakers

A tripped circuit breaker means an agent has failed too many times and is temporarily disabled:

```bash
cd agentic-ai && node -e "
const { createRegistry } = require('./dist/orchestration/index.js');
const registry = createRegistry();
const agents = registry.listAgents?.() || [];
for (const a of agents) {
  const health = registry.getHealth?.(a.id) || {};
  if (health.circuitState === 'open') {
    console.log('CIRCUIT OPEN:', a.id, '- failures:', health.failureCount);
  }
}
"
```

If a circuit is open:
- The agent will not receive new requests until the cool-down period expires
- Check the agent's error logs for root cause
- Consider resetting the circuit manually after fixing the issue

### 5. Common Root Causes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Timeout on all requests | API key missing/expired | Check env vars |
| Circuit breaker open | Repeated 500s from provider | Check provider status, rotate key |
| DLQ filling up | Schema mismatch in tool output | Validate tool return format |
| Wrong agent selected | Intent classifier mis-routing | Update routing table thresholds |
| Cost budget exceeded | Too many agentic hops | Lower MAX_AGENT_ITERATIONS |
| Circular handoff detected | Agent A hands to B hands to A | Fix routing rules, add exclusion |

### 6. Recovery Actions

After identifying the root cause:

1. Fix the underlying issue (config, code, or external dependency)
2. Clear the DLQ if entries are stale: reset via the DLQ API
3. Reset circuit breakers if the fix resolves the failure pattern
4. Run the pipeline tests: `/run-agent-pipeline`
5. Monitor metrics for 5 minutes to confirm stability
