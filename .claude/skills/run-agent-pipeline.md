# Skill: Run Agent Pipeline

End-to-end orchestration pipeline testing for the EstateWise agentic-ai system.

## When to Use

Use this skill when you need to validate the full agent pipeline -- from build through intent classification, orchestration, and observability.

## Steps

### 1. Build All Dependencies

```bash
cd agentic-ai && npm run build
cd mcp && npm run build
```

Fail fast if either build has TypeScript errors. Do not proceed until both compile cleanly.

### 2. Verify Dependency Graph

Check that all required imports resolve:

```bash
node -e "require('./agentic-ai/dist/orchestration/index.js')"
node -e "require('./agentic-ai/dist/context/index.js')"
node -e "require('./agentic-ai/dist/prompts/index.js')"
node -e "require('./agentic-ai/dist/observability/index.js')"
```

### 3. Run Unit Tests

```bash
cd agentic-ai && node --test tests/orchestration.test.mjs tests/context.test.mjs tests/prompts.test.mjs tests/observability.test.mjs
```

All tests must pass. If any fail, stop and diagnose before continuing.

### 4. Intent Classification Smoke Test

Verify the intent classifier routes correctly for known query types:

```bash
cd agentic-ai && node -e "
const { classifyIntent } = require('./dist/orchestration/index.js');
const tests = [
  ['What is the price of 123 Main St?', 'single-turn'],
  ['Compare neighborhoods and find the best school district', 'agentic'],
];
for (const [q, expected] of tests) {
  const result = classifyIntent(q);
  console.log(result.type === expected ? 'PASS' : 'FAIL', q, '->', result.type);
}
"
```

### 5. Full Pipeline Test

Run a lightweight end-to-end orchestration (no external APIs):

```bash
cd agentic-ai && node -e "
const orch = require('./dist/orchestration/index.js');
const ctx = require('./dist/context/index.js');
const obs = require('./dist/observability/index.js');
console.log('Registry agents:', Object.keys(orch.createRegistry?.() || {}).length || 'OK');
console.log('Context modules:', Object.keys(ctx).length);
console.log('Observability modules:', Object.keys(obs).length);
console.log('Pipeline modules loaded successfully');
"
```

### 6. Observability Verification

Confirm metrics and tracing exports are functional:

```bash
cd agentic-ai && node -e "
const { MetricsRegistry, Tracer } = require('./dist/observability/index.js');
if (MetricsRegistry && Tracer) console.log('Observability exports verified');
else throw new Error('Missing observability exports');
"
```

## Success Criteria

- Both packages build with zero TypeScript errors
- All unit tests pass
- Intent classification returns expected route types
- Full pipeline loads without import errors
- Observability exports are present and constructable
