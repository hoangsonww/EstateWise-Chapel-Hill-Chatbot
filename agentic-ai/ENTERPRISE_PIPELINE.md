# Enterprise Pipeline System

## Complete Documentation

This document provides comprehensive documentation for the enterprise-grade pipeline system that has been added to the EstateWise agentic AI platform.

## See Also

- [Full Pipeline API Documentation](src/pipeline/README.md) - Complete API reference
- [Pipeline Enhancement Overview](PIPELINE_ENHANCEMENT.md) - Technical overview
- [Main README](README.md) - Agentic AI system documentation

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Core Features](#core-features)
4. [9 Major Feature Sets](#9-major-feature-sets)
5. [Integration with Agentic AI](#integration-with-agentic-ai)
6. [Complete Examples](#complete-examples)
7. [Best Practices](#best-practices)

## Overview

The Enterprise Pipeline System transforms the EstateWise agentic AI into a world-class orchestration platform with:

- **~11,300 lines** of production-ready code
- **23 modules** with comprehensive TypeScript types
- **9 major feature sets** for enterprise capabilities
- **100% backward compatible** with existing code

### What It Adds

The pipeline system adds an assembly line design pattern on top of the existing agentic AI architecture, enabling:

- Sequential stage processing with clear data flow
- Composable, reusable stages
- Rich middleware system for cross-cutting concerns
- Advanced orchestration (parallel, branching, composition)
- Enterprise features (persistence, distributed, scheduling, testing, optimization)

## Quick Start

### Basic Pipeline

```typescript
import { createPipeline } from './pipeline';

const pipeline = createPipeline({ name: 'my-pipeline' })
  .withLogging({ logLevel: 'info' })
  .stage('fetch-data', async (context) => {
    return await fetchData(context.input);
  })
  .stage('process', async (context) => {
    return processData(context.state['fetch-data']);
  })
  .build();

const result = await pipeline.execute('input data');
console.log(result.output);
```

### Using with Existing Orchestrator

```typescript
import { AgentOrchestrator } from './orchestrator/AgentOrchestrator';
import { createOrchestratorPipeline } from './pipeline/integration';

const orchestrator = new AgentOrchestrator();
// Register agents...

const { pipeline, monitor } = createOrchestratorPipeline(orchestrator, {
  rounds: 4,
  enableMonitoring: true,
});

const result = await pipeline.execute('Find homes in Chapel Hill');
```

### Using Templates

```typescript
import { createMarketResearchPipeline } from './pipeline';
import { ToolClient } from './mcp/ToolClient';

const toolClient = new ToolClient();
await toolClient.start();

const pipeline = createMarketResearchPipeline({
  toolClient,
  enableLogging: true,
  enableMetrics: true,
});

const result = await pipeline.execute('Find 3 bed homes in Chapel Hill under $500k');
```

## Core Features

### Assembly Line Design Pattern

Pipelines are constructed as a series of stages that process data sequentially:

```typescript
Input → [Stage 1] → [Stage 2] → [Stage 3] → ... → [Stage N] → Output
         ↓           ↓           ↓                   ↓
      [Middleware] [Middleware] [Middleware]     [Middleware]
```

### Key Components

**Pipeline** - Main orchestration class managing stages, middleware, and context
**Stage** - Individual processing unit with retry logic, timeout, and validation
**Context** - Shared state flowing through all stages
**Middleware** - Cross-cutting concerns (logging, metrics, caching, etc.)

### 10+ Built-in Middleware

1. **Logging** - Console logging with configurable levels
2. **Metrics** - Performance metrics collection
3. **Performance** - Slow stage detection
4. **Validation** - Input/output validation
5. **Rate Limiting** - Request throttling
6. **Audit** - Audit trail logging
7. **Timeout** - Pipeline-level timeouts
8. **Circuit Breaker** - Failure protection
9. **Tracing** - Distributed tracing
10. **Error Recovery** - Automatic retry logic

## 9 Major Feature Sets

### 1. State Persistence & Checkpointing

Save and restore pipeline state for long-running pipelines and failure recovery.

```typescript
import { CheckpointManager, createCheckpointMiddleware } from './pipeline';

const checkpointMgr = new CheckpointManager({
  storage: new FileStateStorage('./.checkpoints'),
  checkpointInterval: 30000,
  maxCheckpoints: 10,
});

pipeline.use(createCheckpointMiddleware(checkpointMgr));

// Resume from checkpoint
await resumeFromCheckpoint('checkpoint-123', checkpointMgr, pipeline);
```

**Features:**
- Automatic checkpointing at intervals or per-stage
- Multiple storage backends (File, Memory, Redis)
- Snapshot manager for rollback
- Resume interrupted pipelines

**Use Cases:**
- Long-running pipelines (hours/days)
- Failure recovery
- Debugging and replay
- Distributed systems

### 2. Distributed Execution

Scale horizontally with worker pools and load balancing.

```typescript
import { WorkerPool, PipelineWorker, DistributedPipelineExecutor } from './pipeline';

// Create worker pool
const workerPool = new WorkerPool({ maxWorkers: 4 });

// Add workers
const worker = new PipelineWorker({ id: 'worker-1', queue: new InMemoryQueue() });
worker.registerStage(myStage);
workerPool.addWorker(worker);

// Execute distributed
const executor = new DistributedPipelineExecutor({ workerPool });
await executor.executeStage(stage, context);
```

**Features:**
- Worker pools with heartbeat monitoring
- Load balancing (round-robin, least-loaded, random)
- Priority queues
- Automatic retries

**Use Cases:**
- High-throughput processing
- Resource-intensive stages
- Horizontal scaling
- Stage isolation

### 3. Advanced Scheduling

Schedule pipelines with cron expressions, dependencies, and recurrence.

```typescript
import { PipelineScheduler, DependencyGraph } from './pipeline';

const scheduler = new PipelineScheduler();

scheduler.addSchedule({
  id: 'daily-report',
  pipeline: reportPipeline,
  schedule: '0 9 * * *',  // Every day at 9 AM
  enabled: true,
  retryOnFailure: true,
  dependencies: ['data-sync'],
});

scheduler.start();
```

**Features:**
- Full cron expression support
- Pipeline dependencies with topological sorting
- Delayed and recurring execution
- Retry on failure with exponential backoff

**Use Cases:**
- Batch processing
- Periodic tasks
- ETL workflows
- Workflow orchestration

### 4. Testing Framework

Comprehensive testing with mocks, spies, and assertions.

```typescript
import { TestRunner, MockStage, Assertions } from './pipeline';

const suite = {
  name: 'My Pipeline Tests',
  pipeline: myPipeline,
  tests: [
    {
      name: 'should process successfully',
      input: 'test data',
      expectedSuccess: true,
      expectedOutput: 'expected result',
    }
  ],
};

const result = await TestRunner.runSuite(suite);
console.log(TestRunner.formatResult(result));
```

**Features:**
- Mock and spy stages
- 10+ assertion helpers
- Test suite runner with setup/teardown
- Coverage tracking

**Use Cases:**
- Unit testing
- Integration testing
- TDD workflows
- Regression testing

### 5. Auto-Optimization

AI-powered performance analysis and recommendations.

```typescript
import { PipelineOptimizer, PerformanceBudget } from './pipeline';

const optimizer = new PipelineOptimizer(monitor);

// Analyze performance
const profile = optimizer.analyzePerformance('my-pipeline');
console.log('P95 duration:', profile.p95Duration);

// Get recommendations
const recommendations = optimizer.generateRecommendations('my-pipeline');
recommendations.forEach(rec => {
  console.log(`${rec.priority}: ${rec.recommendation}`);
});

// Set performance budget
const budget = new PerformanceBudget();
budget.setBudget('my-pipeline', {
  maxDuration: 5000,
  maxMemory: 512,
});
```

**Features:**
- Performance profiling (P50, P95, P99)
- Bottleneck detection
- Automated recommendations
- Resource tracking (CPU, memory)
- Performance budgets

**Use Cases:**
- Performance tuning
- Cost optimization
- SLA compliance
- Capacity planning

### 6. Plugin Architecture

Extend pipelines with custom plugins and integrations.

```typescript
import { PluginRegistry, NotificationPlugin } from './pipeline';

const registry = new PluginRegistry();

await registry.register(new NotificationPlugin({
  onPipelineComplete: (result) => {
    console.log('Pipeline completed:', result.success);
  }
}));

await registry.enable('notifications');
```

**Features:**
- Plugin lifecycle hooks
- Dependency management
- Extension points
- Built-in plugins (Notification, Metrics, Webhook)
- Dynamic loading

**Use Cases:**
- Custom integrations
- Third-party tools
- Modular architecture
- Extensibility

### 7. Visualization & DAG

Create visual representations of pipelines.

```typescript
import { PipelineDAGBuilder, DashboardGenerator } from './pipeline';

// Build DAG
const dag = PipelineDAGBuilder.buildDAG(pipeline);

// Export formats
const mermaid = PipelineDAGBuilder.toMermaid(dag);
const dot = PipelineDAGBuilder.toDOT(dag);
const json = PipelineDAGBuilder.toJSON(dag);

// Generate dashboard
const dashboard = DashboardGenerator.generateASCIIDashboard(data, 'My Pipeline');
console.log(dashboard);
```

**Features:**
- DAG graph construction
- Multiple export formats (Mermaid, Graphviz, JSON)
- ASCII timelines
- Performance dashboards
- Flow diagrams

**Use Cases:**
- Documentation
- Monitoring
- Debugging
- Presentations

### 8. Multi-Level Caching

Three-tier cache hierarchy for optimal performance.

```typescript
import { MultiLevelCache, CacheWarmer } from './pipeline';

const cache = new MultiLevelCache({
  l1MaxSize: 100,  // Fast in-memory
  redisClient: redis,  // Medium Redis
  l3BasePath: './.cache',  // Slow file-based
});

// Cache operations
await cache.set('key', value, 300000);  // 5 minutes TTL
const result = await cache.get('key');

// Cache warming
const warmer = new CacheWarmer();
await warmer.warmCache(cache, ['key1', 'key2'], fetchFunction);
```

**Features:**
- L1/L2/L3 cache hierarchy
- Automatic promotion
- Cache warming
- Hit/miss tracking
- LRU eviction

**Use Cases:**
- Performance optimization
- Reducing API calls
- Offline support
- Cost reduction

### 9. Human-in-the-Loop Workflows

Interactive pipelines with approval gates and user input.

```typescript
import { ApprovalManager, ApprovalGateStage } from './pipeline';

const approvalMgr = new ApprovalManager();

const gate = new ApprovalGateStage({
  stageName: 'deployment-approval',
  requiresApproval: (ctx) => ctx.state.environment === 'production',
  approvalMessage: 'Approve production deployment?',
  timeout: 300000,
  onTimeout: 'reject',
}, approvalMgr);

pipeline.addStage(gate);

// Handle approval
approvalMgr.on('approval-requested', (request) => {
  console.log('Approval needed:', request.message);
});

// Respond
approvalMgr.respond({
  requestId: request.id,
  approved: true,
  approvedBy: 'admin',
});
```

**Features:**
- Approval gates with timeout
- User input collection
- Notification services
- Multi-approver support
- Event-driven notifications

**Use Cases:**
- Manual review
- Compliance workflows
- Interactive pipelines
- Deployment gates

## Integration with Agentic AI

The pipeline system integrates seamlessly with all parts of the agentic AI system:

### With AgentOrchestrator

```typescript
import { AgentOrchestrator } from './orchestrator/AgentOrchestrator';
import { createOrchestratorPipeline } from './pipeline/integration';

const orchestrator = new AgentOrchestrator();
// Register all agents

const { pipeline, monitor } = createOrchestratorPipeline(orchestrator, {
  rounds: 4,
  enableMonitoring: true,
});

// Execute with full pipeline features
const result = await pipeline.execute('Find homes in Chapel Hill');

// Get metrics
const metrics = monitor.getMetrics('orchestrator-pipeline');
console.log('Success rate:', metrics.successRate);
```

### With Individual Agents

```typescript
import { createAgentStage } from './pipeline/stages/AgentStages';
import { PlannerAgent, CoordinatorAgent } from './agents';

const pipeline = createPipeline({ name: 'agent-pipeline' })
  .addStage(createAgentStage(new PlannerAgent()))
  .addStage(createAgentStage(new CoordinatorAgent()))
  .build();
```

### With LangGraph Runtime

```typescript
import { EstateWiseLangGraphRuntime } from './lang/graph';

const pipeline = createPipeline({ name: 'langgraph-pipeline' })
  .stage('langgraph', async (ctx) => {
    const runtime = new EstateWiseLangGraphRuntime();
    return runtime.run({ goal: ctx.input, threadId: 'thread-1' });
  })
  .withLogging()
  .withMetrics()
  .build();
```

### With CrewAI Runtime

```typescript
import { CrewRuntime } from './crewai/CrewRunner';

const pipeline = createPipeline({ name: 'crewai-pipeline' })
  .stage('crewai', async (ctx) => {
    const runtime = new CrewRuntime();
    return runtime.run(ctx.input);
  })
  .build();
```

### With MCP Tools

The pipeline system works directly with MCP tools:

```typescript
import { ToolClient } from './mcp/ToolClient';
import { createPropertySearchPipeline } from './pipeline';

const toolClient = new ToolClient();
await toolClient.start();

const pipeline = createPropertySearchPipeline({ toolClient });
const result = await pipeline.execute('Find 3 bed homes');
```

## Complete Examples

### Example 1: Enterprise Workflow

```typescript
import { PipelineSystem } from './pipeline';

// Create comprehensive pipeline
const pipeline = PipelineSystem.create({ name: 'enterprise' })
  // Middleware
  .withLogging({ logLevel: 'info' })
  .withMetrics({ onMetrics: saveMetrics })
  .withCaching({ ttl: 300000 })
  .use(PipelineSystem.persistence.createCheckpointMiddleware(checkpointMgr))
  .use(PipelineSystem.workflows.createApprovalMiddleware(approvalMgr))

  // Stages
  .stage('parse', parseStage)
  .addStage(new PipelineSystem.workflows.ApprovalGate(config, approvalMgr))
  .stage('process', processStage)
  .build();

// Schedule it
const scheduler = new PipelineSystem.scheduling.Scheduler();
scheduler.addSchedule({
  pipeline,
  schedule: '0 */6 * * *',  // Every 6 hours
  dependencies: ['data-sync'],
});

// Monitor it
const monitor = new PipelineSystem.monitoring.Monitor();
pipeline.use(PipelineSystem.monitoring.createMiddleware(monitor));

// Visualize it
const dag = PipelineSystem.visualization.DAGBuilder.buildDAG(pipeline);
console.log(PipelineSystem.visualization.DAGBuilder.toMermaid(dag));
```

### Example 2: Distributed Processing

```typescript
// Setup worker pool
const workerPool = new PipelineSystem.distributed.WorkerPool({ maxWorkers: 4 });

for (let i = 0; i < 4; i++) {
  const worker = new PipelineSystem.distributed.Worker({
    id: `worker-${i}`,
    queue: new PipelineSystem.distributed.PriorityQueue(),
  });

  worker.registerStage(expensiveStage);
  workerPool.addWorker(worker);
}

await workerPool.startAll();

// Execute distributed
const executor = new PipelineSystem.distributed.Executor({ workerPool });
```

### Example 3: Testing Pipeline

```typescript
const suite = {
  name: 'Market Research Pipeline Tests',
  pipeline: marketResearchPipeline,

  beforeAll: async () => {
    await toolClient.start();
  },

  tests: [
    {
      name: 'should find properties',
      input: 'Find 3 bed homes in Chapel Hill',
      expectedSuccess: true,
      timeout: 30000,
    },
    {
      name: 'should handle invalid input',
      input: '',
      expectedSuccess: false,
      expectedError: /invalid/i,
    },
  ],

  afterAll: async () => {
    await toolClient.stop();
  },
};

const result = await PipelineSystem.testing.TestRunner.runSuite(suite);
console.log(PipelineSystem.testing.TestRunner.formatResult(result));
```

## Best Practices

### 1. Keep Stages Focused

Each stage should do one thing well:

```typescript
// Good
.stage('fetch', fetchData)
.stage('validate', validateData)
.stage('transform', transformData)

// Bad
.stage('do-everything', doEverything)
```

### 2. Use Middleware for Cross-Cutting Concerns

Don't repeat logging/metrics in each stage:

```typescript
// Good
pipeline
  .withLogging()
  .withMetrics()
  .stage('work', doWork)

// Bad
.stage('work', async (ctx) => {
  console.log('Starting...');
  const start = Date.now();
  const result = await doWork();
  console.log('Done in', Date.now() - start);
  return result;
})
```

### 3. Enable Monitoring in Production

```typescript
const monitor = new PipelineMonitor();
pipeline.use(createMonitoringMiddleware(monitor));

// Check health periodically
setInterval(() => {
  const health = new PipelineHealthChecker(monitor).checkHealth('my-pipeline');
  if (!health.healthy) {
    alert(health.issues);
  }
}, 60000);
```

### 4. Use Checkpointing for Long Pipelines

```typescript
if (estimatedDuration > 300000) {  // > 5 minutes
  pipeline.use(createCheckpointMiddleware(checkpointMgr));
}
```

### 5. Cache Expensive Operations

```typescript
// Cache API calls
.stage('expensive-api', async (ctx) => {
  const cached = await cache.get(ctx.input);
  if (cached) return cached;

  const result = await expensiveApiCall(ctx.input);
  await cache.set(ctx.input, result, 300000);
  return result;
})
```

## See Full Documentation

For complete API reference, see:
- [src/pipeline/README.md](src/pipeline/README.md) - Full API documentation
- [PIPELINE_ENHANCEMENT.md](PIPELINE_ENHANCEMENT.md) - Technical overview
- [src/pipeline/examples.ts](src/pipeline/examples.ts) - 10+ working examples

## License

MIT
