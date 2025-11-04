# EstateWise Pipeline System

A powerful assembly line design pattern for building composable, observable, and resilient agentic AI workflows.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Core Concepts](#core-concepts)
- [Quick Start](#quick-start)
- [Pipeline Templates](#pipeline-templates)
- [Advanced Features](#advanced-features)
- [Middleware](#middleware)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)
- [API Reference](#api-reference)

## Overview

The EstateWise Pipeline System provides a sophisticated assembly line architecture for orchestrating multi-agent AI workflows. It builds on top of the existing agentic AI infrastructure while adding:

- **Assembly Line Pattern**: Sequential stage processing with clear data flow
- **Composability**: Combine simple stages into complex pipelines
- **Observability**: Built-in monitoring, metrics, and tracing
- **Resilience**: Error recovery, retries, circuit breakers
- **Flexibility**: Parallel execution, conditional branching, dynamic construction

## Key Features

### 🏭 Assembly Line Architecture
- **Stages**: Independent processing units with clear inputs/outputs
- **Context**: Shared state that flows through all stages
- **Middleware**: Cross-cutting concerns (logging, metrics, caching)
- **Composition**: Combine pipelines into larger workflows

### 🚀 Performance
- **Parallel Execution**: Run independent stages concurrently
- **Caching**: Built-in result caching with TTL
- **Streaming**: Real-time event streaming for long-running pipelines
- **Timeouts**: Per-stage and pipeline-level timeout controls

### 🛡️ Resilience
- **Retries**: Automatic retry with exponential backoff
- **Error Recovery**: Custom recovery strategies
- **Circuit Breakers**: Prevent cascading failures
- **Fallbacks**: Alternative execution paths on failure

### 📊 Observability
- **Monitoring**: Track execution traces and metrics
- **Events**: Subscribe to pipeline lifecycle events
- **Visualization**: ASCII flow diagrams and execution traces
- **Health Checks**: Automated pipeline health assessment

## Core Concepts

### Pipeline

A pipeline is a sequence of stages that process data in an assembly line fashion.

```typescript
const pipeline = createPipeline({ name: 'my-pipeline' })
  .stage('parse', async (context) => {
    return parseInput(context.input);
  })
  .stage('process', async (context) => {
    return processData(context.state.parse);
  })
  .stage('output', async (context) => {
    return formatOutput(context.state.process);
  })
  .build();

const result = await pipeline.execute('input data');
```

### Stage

A stage is a single processing unit in the pipeline. Each stage:
- Receives a context with input, state, and metadata
- Performs its operation
- Returns a result with output and status
- Can be retried on failure
- Has timeout controls

```typescript
const stage = createStage(
  'my-stage',
  async (context) => {
    // Stage logic here
    return result;
  },
  {
    description: 'Does something important',
    retryable: true,
    maxRetries: 3,
    timeout: 30000,
  }
);
```

### Context

The pipeline context carries data through all stages:

```typescript
interface PipelineContext {
  executionId: string;        // Unique execution ID
  input: unknown;             // Original input
  state: Record<string, any>; // Accumulated state
  blackboard: Blackboard;     // Agent coordination
  messages: AgentMessage[];   // Agent messages
  metadata: {                 // Execution metadata
    startTime: number;
    currentStage?: string;
    completedStages: string[];
    failedStages: string[];
  };
  signal?: AbortSignal;       // Cancellation support
}
```

### Middleware

Middleware intercepts pipeline execution at key points:

```typescript
const loggingMiddleware = {
  name: 'logging',
  onPipelineStart: async (context) => {
    console.log('Pipeline starting');
  },
  onStageComplete: async (context, stage, result) => {
    console.log(`Stage ${stage.name} completed`);
  },
  onPipelineComplete: async (context, result) => {
    console.log('Pipeline complete');
  },
};
```

## Quick Start

### Basic Pipeline

```typescript
import { createPipeline } from './pipeline';

const pipeline = createPipeline({ name: 'hello-world' })
  .withLogging({ logLevel: 'info' })
  .stage('greet', async (context) => {
    return `Hello, ${context.input}!`;
  })
  .build();

const result = await pipeline.execute('World');
console.log(result.output); // "Hello, World!"
```

### Using Templates

```typescript
import { createPropertySearchPipeline } from './pipeline';

const pipeline = createPropertySearchPipeline({
  toolClient: myToolClient,
  enableLogging: true,
  enableMetrics: true,
});

const result = await pipeline.execute(
  'Find 3 bedroom homes in Chapel Hill under $500k'
);
```

### Custom Stages

```typescript
const pipeline = createPipeline({ name: 'custom' })
  .stage('fetch-data', async (context) => {
    const data = await fetchFromAPI(context.input);
    return data;
  })
  .stage('transform', async (context) => {
    const data = context.state['fetch-data'];
    return transformData(data);
  })
  .stage('save', async (context) => {
    const transformed = context.state.transform;
    await saveToDatabase(transformed);
    return 'saved';
  })
  .build();
```

## Pipeline Templates

Pre-configured pipelines for common use cases:

### Property Search
```typescript
const pipeline = createPropertySearchPipeline({
  toolClient,
  enableLogging: true,
});
```
**Stages**: parse-goal → property-search → dedupe-rank → compliance-check → generate-report

### Market Research
```typescript
const pipeline = createMarketResearchPipeline({
  toolClient,
  enableMetrics: true,
});
```
**Stages**: parse-goal → property-search → analytics-summary → group-by-zip → dedupe-rank → graph-analysis → map-link → compliance-check → generate-report

### Financial Analysis
```typescript
const pipeline = createFinancialAnalysisPipeline({
  toolClient,
  defaultIncome: 120000,
});
```
**Stages**: parse-goal → property-search → mortgage-calculation → affordability-calculation → analytics-summary → dedupe-rank → compliance-check → generate-report

### Quick Lookup
```typescript
const pipeline = createQuickLookupPipeline({ toolClient });
```
**Stages**: parse-goal → map-link → generate-report

### List Templates
```typescript
import { listPipelineTemplates } from './pipeline';

const templates = listPipelineTemplates();
templates.forEach(t => {
  console.log(`${t.name}: ${t.description}`);
  console.log(`Stages: ${t.stages.join(' → ')}`);
});
```

## Advanced Features

### Parallel Execution

Execute multiple stages concurrently:

```typescript
import { createParallelStage, createStage } from './pipeline';

const stage1 = createStage('fetch-users', async () => fetchUsers());
const stage2 = createStage('fetch-properties', async () => fetchProperties());
const stage3 = createStage('fetch-analytics', async () => fetchAnalytics());

const pipeline = createPipeline({ name: 'parallel' })
  .addStage(
    createParallelStage('fetch-all', [stage1, stage2, stage3], {
      maxConcurrency: 3,
      continueOnError: false,
    })
  )
  .build();
```

### Conditional Branching

Route execution based on conditions:

```typescript
import { createBranchStage } from './pipeline';

const pipeline = createPipeline({ name: 'branching' })
  .addStage(
    createBranchStage(
      'route',
      [
        {
          name: 'quick-path',
          condition: (context) => context.input.includes('ZPID'),
          stages: [quickLookupStage],
        },
        {
          name: 'detailed-path',
          condition: () => true,
          stages: [detailedSearchStage, analyticsStage],
        },
      ]
    )
  )
  .build();
```

### Error Recovery

Automatic retry with exponential backoff:

```typescript
import { createRetryStrategy, createErrorRecoveryStage } from './pipeline';

const retryStrategy = createRetryStrategy({
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  shouldRetry: (error) => error.message.includes('timeout'),
});

const resilientStage = createErrorRecoveryStage(
  unreliableStage,
  retryStrategy
);

const pipeline = createPipeline({ name: 'resilient' })
  .addStage(resilientStage)
  .build();
```

### Fallback Strategy

Use alternative logic on failure:

```typescript
import { createFallbackStrategy } from './pipeline';

const fallbackStage = createStage('fallback', async (context) => {
  return getCachedData(context.input);
});

const fallbackStrategy = createFallbackStrategy(fallbackStage);
const resilientStage = createErrorRecoveryStage(
  primaryStage,
  fallbackStrategy
);
```

### Pipeline Composition

Combine multiple pipelines:

```typescript
import { composePipelines } from './pipeline';

const prepPipeline = createPipeline({ name: 'prep' })
  .stage('parse', async (context) => parseInput(context.input))
  .build();

const processPipeline = createPipeline({ name: 'process' })
  .stage('transform', async (context) => transform(context.input))
  .build();

const composed = composePipelines([prepPipeline, processPipeline], {
  name: 'full-workflow',
});
```

### Dynamic Pipelines

Construct stages at runtime:

```typescript
import { createDynamicPipeline } from './pipeline';

const pipeline = createDynamicPipeline(
  'dynamic',
  async (input, context) => {
    // Decide stages based on input
    if (input.type === 'quick') {
      return [quickStage1, quickStage2];
    } else {
      return [detailedStage1, detailedStage2, detailedStage3];
    }
  }
);
```

### Loop Stage

Repeat a stage until condition is met:

```typescript
import { createLoopStage } from './pipeline';

const loopStage = createLoopStage(
  'fetch-pages',
  fetchPageStage,
  async (context, iteration) => {
    // Continue while hasMore is true
    return context.state.hasMore && iteration < 10;
  },
  { maxIterations: 10 }
);
```

### Map/Filter/Reduce

Functional programming patterns:

```typescript
import { createMapStage, createFilterStage, createReduceStage } from './pipeline';

// Map over items
const mapStage = createMapStage(
  'process-items',
  (context) => context.state.items,
  async (item, index, context) => processItem(item)
);

// Filter items
const filterStage = createFilterStage(
  'filter-active',
  (context) => context.state.items,
  (item) => item.active
);

// Reduce to single value
const reduceStage = createReduceStage(
  'sum-prices',
  (context) => context.state.properties,
  (sum, property) => sum + property.price,
  0
);
```

## Middleware

### Logging

```typescript
pipeline.withLogging({
  logLevel: 'debug',
  logger: console,
  includeContext: true,
});
```

### Metrics

```typescript
pipeline.withMetrics({
  onMetrics: (metrics) => {
    console.log('Duration:', metrics.duration);
    console.log('Stages:', metrics.stageMetrics);
  },
});
```

### Caching

```typescript
pipeline.withCaching({
  ttl: 300000, // 5 minutes
});
```

### Validation

```typescript
pipeline.withValidation({
  validateInput: (input) => typeof input === 'string',
  validateOutput: (output) => output != null,
});
```

### Rate Limiting

```typescript
pipeline.withRateLimit({
  maxRequestsPerWindow: 10,
  windowMs: 60000, // 1 minute
});
```

### Audit Logging

```typescript
pipeline.withAudit({
  onAudit: async (event) => {
    await logToDatabase(event);
  },
  getUserId: () => currentUser.id,
});
```

### Circuit Breaker

```typescript
import { createCircuitBreakerMiddleware } from './pipeline';

pipeline.use(
  createCircuitBreakerMiddleware({
    failureThreshold: 5,
    resetTimeout: 60000,
    onCircuitOpen: () => console.log('Circuit opened'),
  })
);
```

### Tracing

```typescript
import { createTracingMiddleware } from './pipeline';

pipeline.use(
  createTracingMiddleware({
    serviceName: 'estate-wise',
    onSpan: async (span) => {
      await sendToJaeger(span);
    },
  })
);
```

## Monitoring

### Pipeline Monitor

Track execution traces and metrics:

```typescript
import { PipelineMonitor, createMonitoringMiddleware } from './pipeline';

const monitor = new PipelineMonitor();

const pipeline = createPipeline({ name: 'monitored' })
  .use(createMonitoringMiddleware(monitor))
  .build();

await pipeline.execute('input');

// Get metrics
const metrics = monitor.getMetrics('monitored');
console.log('Success rate:', metrics.successRate);
console.log('Average duration:', metrics.averageDuration);

// Get slow stages
const slowStages = monitor.getSlowStages('monitored', 5000);

// Visualize flow
console.log(monitor.visualizeFlow('monitored'));
```

### Event Stream

Subscribe to real-time events:

```typescript
import { PipelineEventStream } from './pipeline';

const eventStream = new PipelineEventStream();

eventStream.subscribe((event) => {
  console.log(`[${event.type}] ${event.stageName || ''}`);
});

const pipeline = createPipeline({ name: 'streaming' })
  .use(eventStream.createMiddleware())
  .build();
```

### Health Checker

Assess pipeline health:

```typescript
import { PipelineHealthChecker } from './pipeline';

const healthChecker = new PipelineHealthChecker(monitor);

const health = healthChecker.checkHealth('my-pipeline');
console.log('Healthy:', health.healthy);
console.log('Issues:', health.issues);
```

### Execution Traces

View detailed execution traces:

```typescript
const trace = monitor.getTrace(executionId);
console.log(monitor.visualizeTrace(executionId));

// Output:
// Pipeline: my-pipeline
// Execution ID: abc-123
// Status: ✓ Success
// Duration: 1250ms
//
// Stages:
//   ✓ stage1 - 150ms
//   ✓ stage2 - 300ms (2 attempts)
//   ✓ stage3 - 800ms
```

## Best Practices

### 1. Keep Stages Focused

Each stage should do one thing well:

```typescript
// ✅ Good - focused stages
.stage('fetch-data', async (context) => fetchData(context.input))
.stage('validate-data', async (context) => validateData(context.state['fetch-data']))
.stage('transform-data', async (context) => transformData(context.state['validate-data']))

// ❌ Bad - stage does too much
.stage('do-everything', async (context) => {
  const data = await fetchData(context.input);
  validateData(data);
  return transformData(data);
})
```

### 2. Use Meaningful Names

Name stages and pipelines descriptively:

```typescript
// ✅ Good
const pipeline = createPipeline({ name: 'property-search-with-analytics' });
pipeline.stage('parse-search-filters', ...);

// ❌ Bad
const pipeline = createPipeline({ name: 'pipeline1' });
pipeline.stage('step1', ...);
```

### 3. Add Appropriate Timeouts

Set timeouts based on expected duration:

```typescript
.stage('quick-lookup', async (context) => lookup(context.input), {
  timeout: 5000, // 5 seconds for fast operations
})
.stage('heavy-processing', async (context) => process(context.input), {
  timeout: 60000, // 60 seconds for heavy operations
})
```

### 4. Use Middleware for Cross-Cutting Concerns

Don't repeat logging, metrics, etc. in each stage:

```typescript
// ✅ Good
const pipeline = createPipeline({ name: 'my-pipeline' })
  .withLogging({ logLevel: 'info' })
  .withMetrics({ onMetrics: saveMetrics })
  .stage('stage1', ...)
  .stage('stage2', ...)
  .build();

// ❌ Bad
.stage('stage1', async (context) => {
  console.log('Starting stage1');
  const start = Date.now();
  const result = await doWork();
  console.log('Duration:', Date.now() - start);
  return result;
})
```

### 5. Enable Caching for Expensive Operations

```typescript
const pipeline = createPipeline({ name: 'expensive' })
  .withCaching({ ttl: 300000 }) // Cache for 5 minutes
  .stage('expensive-computation', async (context) => {
    // Heavy computation
    return result;
  })
  .build();
```

### 6. Handle Errors Gracefully

Use error recovery for transient failures:

```typescript
const resilientStage = createErrorRecoveryStage(
  networkStage,
  createRetryStrategy({ maxAttempts: 3, baseDelay: 1000 })
);
```

### 7. Monitor Production Pipelines

Always add monitoring in production:

```typescript
const monitor = new PipelineMonitor();

const pipeline = createPipeline({ name: 'production' })
  .use(createMonitoringMiddleware(monitor))
  .withLogging({ logLevel: 'warn' })
  .withMetrics({ onMetrics: sendToDatadog })
  .build();

// Periodically check health
setInterval(() => {
  const health = healthChecker.checkHealth('production');
  if (!health.healthy) {
    alertOps(health.issues);
  }
}, 60000);
```

## API Reference

### Core Functions

- `createPipeline(options)` - Create a new pipeline builder
- `createStage(name, execute, options)` - Create a stage
- `createPipelineFromFunction(name, fn)` - Create pipeline from function

### Templates

- `createPropertySearchPipeline(options)` - Property search template
- `createMarketResearchPipeline(options)` - Market research template
- `createFinancialAnalysisPipeline(options)` - Financial analysis template
- `createQuickLookupPipeline(options)` - Quick lookup template
- `createGraphAnalysisPipeline(options)` - Graph analysis template
- `getPipelineTemplate(name, options)` - Get template by name
- `listPipelineTemplates()` - List all templates

### Advanced

- `composePipelines(pipelines, options)` - Compose multiple pipelines
- `createParallelStage(name, stages, options)` - Parallel execution
- `createBranchStage(name, branches, defaultBranch, options)` - Conditional branching
- `createErrorRecoveryStage(stage, strategy, options)` - Error recovery
- `createRetryStrategy(options)` - Retry strategy
- `createFallbackStrategy(fallbackStage)` - Fallback strategy
- `createDynamicPipeline(name, stageFactory, options)` - Dynamic construction
- `createLoopStage(name, stage, condition, options)` - Loop execution
- `createMapStage(name, getItems, mapper, options)` - Map operation
- `createFilterStage(name, getItems, predicate, options)` - Filter operation
- `createReduceStage(name, getItems, reducer, initialValue, options)` - Reduce operation

### Middleware

- `createLoggingMiddleware(options)` - Logging
- `createMetricsMiddleware(options)` - Metrics collection
- `createPerformanceMiddleware(options)` - Performance monitoring
- `createValidationMiddleware(options)` - Input/output validation
- `createRateLimitMiddleware(options)` - Rate limiting
- `createAuditMiddleware(options)` - Audit logging
- `createTimeoutMiddleware(options)` - Pipeline timeout
- `createCircuitBreakerMiddleware(options)` - Circuit breaker
- `createTracingMiddleware(options)` - Distributed tracing

### Monitoring

- `new PipelineMonitor()` - Create monitor
- `new PipelineEventStream()` - Create event stream
- `new PipelineHealthChecker(monitor)` - Create health checker
- `createMonitoringMiddleware(monitor)` - Monitoring middleware

---

## Examples

See `examples.ts` for comprehensive examples demonstrating all features.

Run examples:
```bash
npm run examples
```

## License

MIT
