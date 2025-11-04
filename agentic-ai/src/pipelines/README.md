# EstateWise Pipelines

Production-ready pipeline implementations for common EstateWise real estate workflows.

## Overview

This directory contains specialized, high-level pipelines built on top of the [Enterprise Pipeline System](../pipeline/README.md). Each pipeline is designed for specific real estate use cases and provides a simple, intuitive API.

## Architecture

```
pipelines/                      # High-level, use-case specific pipelines
├── propertySearch.ts          # Property search workflows
├── financialAnalysis.ts       # Financial calculations & analysis
├── complianceCheck.ts         # Regulatory compliance verification
├── graphAnalysis.ts           # Graph-based analytics
├── marketResearch.ts          # Market research & trends
├── compositeWorkflows.ts      # Multi-pipeline workflows
├── index.ts                   # Main exports
└── README.md                  # This file

pipeline/                       # Enterprise pipeline infrastructure
├── types.ts                   # Core type definitions
├── Pipeline.ts                # Pipeline orchestration
├── Stage.ts                   # Stage implementations
├── middleware.ts              # Cross-cutting concerns
├── advanced.ts                # Advanced features
├── monitoring.ts              # Execution monitoring
├── persistence.ts             # State management
├── distributed.ts             # Distributed execution
├── scheduler.ts               # Task scheduling
├── testing.ts                 # Testing utilities
├── optimization.ts            # Auto-optimization
├── plugins.ts                 # Plugin system
├── visualization.ts           # DAG visualization
├── caching.ts                 # Multi-level caching
├── workflows.ts               # Human-in-the-loop
└── stages/                    # Agent-specific stages
    └── AgentStages.ts         # EstateWise agent stages
```

## Available Pipelines

### 1. Property Search Pipelines

Search and analyze properties based on natural language queries.

```typescript
import { runPropertySearch, Pipelines } from './pipelines';

// Quick property search
const results = await runPropertySearch('3 bedroom houses in Chapel Hill under $500k', {
  maxResults: 20,
  includeMap: true,
  cacheResults: true,
});

// Advanced search with custom pipeline
const pipeline = Pipelines.propertySearch.createAdvanced();
const result = await pipeline.execute({
  goal: 'Find investment properties near universities',
  maxResults: 50,
});
```

**Variants:**
- `createPropertySearchPipeline()` - Standard search with deduplication and ranking
- `createQuickPropertySearchPipeline()` - Fast search without advanced features
- `createAdvancedPropertySearchPipeline()` - Includes graph and analytics analysis

### 2. Financial Analysis Pipelines

Calculate mortgages, affordability, and investment returns.

```typescript
import { calculateMortgage, checkAffordability, runFinancialAnalysis } from './pipelines';

// Quick mortgage calculation
const mortgage = await calculateMortgage(
  450000,  // Property price
  90000,   // Down payment
  0.065,   // Interest rate
  30       // Loan term (years)
);
console.log(`Monthly payment: $${mortgage.monthlyPayment}`);

// Check affordability
const affordability = await checkAffordability(
  120000,  // Annual income
  1500     // Monthly debts
);
console.log(`Max affordable: $${affordability.maxAffordablePrice}`);

// Comprehensive financial analysis
const analysis = await runFinancialAnalysis({
  goal: 'Find affordable homes in Durham',
  annualIncome: 120000,
  monthlyDebts: 1500,
  downPayment: 100000,
  includeReport: true,
});
```

**Variants:**
- `createFinancialAnalysisPipeline()` - Comprehensive financial analysis
- `createMortgageCalculatorPipeline()` - Simple mortgage calculations
- `createAffordabilityCheckerPipeline()` - Affordability verification
- `createInvestmentAnalysisPipeline()` - Investment property analysis with ROI

### 3. Compliance Check Pipelines

Verify regulatory compliance, zoning, and legal requirements.

```typescript
import { runComplianceCheck, checkZoning } from './pipelines';

// Quick zoning check
const zoningResult = await checkZoning(
  '123 Main St, Chapel Hill, NC',
  'Orange County'
);

if (!zoningResult.compliant) {
  console.log('Zoning issues:', zoningResult.issues);
}

// Comprehensive compliance check
const compliance = await runComplianceCheck({
  goal: 'Check compliance for commercial property',
  transactionType: 'buy',
  includeReport: true,
  auditTrail: true,
});

console.log('Compliant:', compliance.compliant);
console.log('Issues:', compliance.issues);
```

**Variants:**
- `createComplianceCheckPipeline()` - Full compliance verification
- `createZoningCheckPipeline()` - Quick zoning compliance only
- `createDisclosureVerificationPipeline()` - Disclosure requirements
- `createRegulatoryCompliancePipeline()` - Comprehensive regulatory check

### 4. Graph Analysis Pipelines

Discover relationships, patterns, and insights using graph databases.

```typescript
import { runGraphAnalysis, discoverRelationships, findPatterns } from './pipelines';

// Discover property relationships
const relationships = await discoverRelationships(['zpid1', 'zpid2', 'zpid3']);
console.log('Found', relationships.edges.length, 'relationships');

// Find market patterns
const patterns = await findPatterns('Properties near Duke University');
console.log('Patterns:', patterns.patterns);

// Comprehensive graph analysis
const graphAnalysis = await runGraphAnalysis({
  goal: 'Analyze Chapel Hill market trends',
  analysisType: 'all',
  includeVisualization: true,
  includeReport: true,
});
```

**Variants:**
- `createGraphAnalysisPipeline()` - Full graph analysis
- `createRelationshipDiscoveryPipeline()` - Find entity relationships
- `createPatternMatchingPipeline()` - Identify market patterns
- `createNetworkClusteringPipeline()` - Cluster similar properties

### 5. Market Research Pipelines

Comprehensive market analysis with trends, statistics, and insights.

```typescript
import { runMarketResearchPipeline, Pipelines } from './pipelines';

// Quick market overview
const quickOverview = Pipelines.marketResearch.createQuickOverview();
const overview = await quickOverview.execute({
  goal: 'Chapel Hill housing market overview',
});

// Deep market analysis
const deepAnalysis = await runMarketResearchPipeline({
  goal: 'Detailed Durham market analysis',
  includeAnalytics: true,
  includeGraph: true,
  groupByZip: true,
  cacheResults: true,
});

console.log('Properties found:', deepAnalysis.properties.length);
console.log('Analytics:', deepAnalysis.analytics);
console.log('Graph insights:', deepAnalysis.graphData?.insights);
```

**Variants:**
- `createMarketResearchPipeline()` - Standard market research
- `createQuickMarketOverviewPipeline()` - Fast market snapshot
- `createDeepMarketAnalysisPipeline()` - In-depth comprehensive analysis

### 6. Composite Workflows

Multi-pipeline workflows for complex decision-making.

```typescript
import { runComprehensiveAnalysis, runInvestmentWorkflow, runDecisionSupport } from './pipelines';

// Comprehensive property analysis
const comprehensive = await runComprehensiveAnalysis({
  goal: 'Find my ideal home in Chapel Hill',
  budget: {
    maxPrice: 600000,
    downPayment: 120000,
    annualIncome: 150000,
    monthlyDebts: 2000,
  },
  preferences: {
    includeGraph: true,
    includeCompliance: true,
    includeMap: true,
  },
  options: {
    maxResults: 25,
    parallelExecution: true,
    cacheResults: true,
  },
});

// Investment workflow
const investment = await runInvestmentWorkflow(
  'Investment properties near universities',
  {
    maxPrice: 800000,
    annualIncome: 200000,
  }
);

// Decision support
const decision = await runDecisionSupport(
  'Should I buy or rent in Durham?',
  {
    maxPrice: 500000,
    annualIncome: 100000,
  }
);
```

**Variants:**
- `createComprehensiveAnalysisPipeline()` - All-in-one property analysis
- `createInvestmentWorkflowPipeline()` - Investment decision support
- `createDecisionSupportWorkflow()` - Adaptive decision-making workflow

## Quick Start

### Basic Usage

```typescript
import { QuickPipelines } from './pipelines';

// The simplest way to use pipelines
const properties = await QuickPipelines.searchProperties(
  'Affordable homes in Chapel Hill'
);

const mortgage = await QuickPipelines.calculateMortgage(
  450000,  // price
  90000,   // down payment
  0.065,   // interest rate
  30       // term
);

const affordability = await QuickPipelines.checkAffordability(
  120000,  // annual income
  1500     // monthly debts
);
```

### Using Pipeline Templates

```typescript
import { PipelineTemplates } from './pipelines';

// Pre-configured pipelines for common scenarios
const pipeline = PipelineTemplates.firstTimeHomeBuyer();
const result = await pipeline.execute({
  goal: 'Find starter homes in Durham',
  budget: {
    maxPrice: 400000,
    annualIncome: 90000,
  },
});
```

### Custom Pipeline Configuration

```typescript
import { createPropertySearchPipeline } from './pipelines';

// Create custom-configured pipeline
const pipeline = createPropertySearchPipeline({
  enableLogging: true,
  enableMetrics: true,
  enableCaching: true,
  maxResults: 50,
});

const result = await pipeline.execute({
  goal: 'Luxury homes with pools',
  includeMap: true,
});
```

## Integration with Existing Systems

### With AgentOrchestrator

```typescript
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator';
import { createOrchestratorPipeline } from '../pipeline';
import { createPropertySearchPipeline } from './pipelines';

// Wrap orchestrator in a pipeline
const orchestrator = new AgentOrchestrator();
const orchestratorPipeline = createOrchestratorPipeline(orchestrator, {
  maxRounds: 5,
});

// Compose with property search pipeline
const composedPipeline = composePipelines([
  createPropertySearchPipeline(),
  orchestratorPipeline,
]);

const result = await composedPipeline.execute({
  goal: 'Find and analyze properties',
});
```

### With LangGraph Runtime

```typescript
import { createPropertySearchPipeline } from './pipelines';
import { createStage } from '../pipeline';

// Create a LangGraph stage
const langGraphStage = createStage({
  name: 'langgraph-analysis',
  execute: async (context) => {
    // LangGraph integration logic
    return { analyzed: true };
  },
});

// Add to pipeline
const pipeline = createPropertySearchPipeline()
  .stage(langGraphStage)
  .build();
```

### With CrewAI Runtime

```typescript
import { createStage } from '../pipeline';
import { spawn } from 'child_process';

// Create a CrewAI stage
const crewAIStage = createStage({
  name: 'crewai-processing',
  execute: async (context) => {
    // Spawn Python CrewAI process
    // Process results and return
    return { processed: true };
  },
});
```

## Advanced Features

### Monitoring and Metrics

```typescript
import { createPropertySearchPipeline } from './pipelines';
import { PipelineMonitor } from '../pipeline';

const monitor = new PipelineMonitor();
const pipeline = createPropertySearchPipeline({
  enableMetrics: true,
});

pipeline.on('stage:complete', (event) => {
  console.log(`Stage ${event.stageName} completed in ${event.duration}ms`);
});

const result = await pipeline.execute({ goal: 'Find properties' });
const metrics = monitor.getMetrics('property-search');
console.log('Success rate:', metrics.successRate);
```

### Caching

```typescript
import { createMarketResearchPipeline } from './pipelines';

const pipeline = createMarketResearchPipeline({
  enableCaching: true,
});

// First execution - slow (hits database)
const result1 = await pipeline.execute({ goal: 'Market analysis' });

// Second execution - fast (hits cache)
const result2 = await pipeline.execute({ goal: 'Market analysis' });
```

### Error Handling and Retries

```typescript
import { createPropertySearchPipeline } from './pipelines';
import { createRetryStrategy } from '../pipeline';

const pipeline = createPropertySearchPipeline();

// Add retry strategy
pipeline.stages[0].retryable = true;
pipeline.stages[0].maxRetries = 3;
pipeline.stages[0].retryStrategy = createRetryStrategy({
  maxAttempts: 3,
  backoff: 'exponential',
  initialDelay: 1000,
});

try {
  const result = await pipeline.execute({ goal: 'Search properties' });
} catch (error) {
  console.error('Pipeline failed after retries:', error);
}
```

### Parallel Execution

```typescript
import { createComprehensiveAnalysisPipeline } from './pipelines';

// Enable parallel execution for faster results
const pipeline = createComprehensiveAnalysisPipeline({
  enableParallel: true,
});

// Financial, graph, and compliance analysis run in parallel
const result = await pipeline.execute({
  goal: 'Comprehensive property analysis',
  budget: { maxPrice: 500000, annualIncome: 120000 },
  preferences: {
    includeGraph: true,
    includeCompliance: true,
  },
});
```

### State Persistence

```typescript
import { createComprehensiveAnalysisPipeline } from './pipelines';
import { CheckpointManager, FileStateStorage } from '../pipeline';

const checkpointManager = new CheckpointManager(
  new FileStateStorage('./checkpoints')
);

const pipeline = createComprehensiveAnalysisPipeline();

// Execute with checkpointing
const result = await pipeline.execute(
  { goal: 'Long-running analysis' },
  {
    checkpointManager,
    checkpointInterval: 30000, // Every 30 seconds
  }
);

// Resume from checkpoint if needed
if (result.error) {
  const checkpoint = await checkpointManager.getLatestCheckpoint(
    result.context.executionId
  );
  const resumed = await pipeline.resume(checkpoint);
}
```

## Pipeline Composition

Combine multiple pipelines for complex workflows:

```typescript
import { composePipelines } from '../pipeline';
import {
  createPropertySearchPipeline,
  createFinancialAnalysisPipeline,
  createComplianceCheckPipeline,
} from './pipelines';

// Compose pipelines sequentially
const superPipeline = composePipelines([
  createPropertySearchPipeline(),
  createFinancialAnalysisPipeline(),
  createComplianceCheckPipeline(),
]);

const result = await superPipeline.execute({
  goal: 'Complete property evaluation',
});
```

## Testing

All pipelines include comprehensive testing support:

```typescript
import { createPropertySearchPipeline } from './pipelines';
import { MockStage, TestRunner } from '../pipeline';

// Create mock stage for testing
const mockSearch = new MockStage('property-search', {
  properties: [
    { zpid: '123', address: '123 Main St', price: 450000 },
  ],
});

// Replace real stage with mock
const pipeline = createPropertySearchPipeline();
pipeline.stages[1] = mockSearch;

// Run test
const result = await pipeline.execute({ goal: 'Test search' });
expect(result.success).toBe(true);
expect(mockSearch.wasCalled()).toBe(true);
```

## Performance Optimization

### Auto-Optimization

```typescript
import { PipelineOptimizer } from '../pipeline';
import { createComprehensiveAnalysisPipeline } from './pipelines';

const optimizer = new PipelineOptimizer();
const pipeline = createComprehensiveAnalysisPipeline();

// Run pipeline multiple times
for (let i = 0; i < 10; i++) {
  await pipeline.execute({ goal: 'Analyze properties' });
}

// Get optimization recommendations
const recommendations = optimizer.generateRecommendations('comprehensive-analysis');
console.log('Recommendations:', recommendations);

// Auto-tune pipeline
await optimizer.autoTune('comprehensive-analysis');
```

### Resource Tracking

```typescript
import { ResourceTracker } from '../pipeline';

const tracker = new ResourceTracker();
tracker.start(1000); // Track every second

const result = await pipeline.execute({ goal: 'Resource-intensive task' });

const stats = tracker.getStats();
console.log('CPU usage:', stats.cpu);
console.log('Memory usage:', stats.memory);

tracker.stop();
```

## Visualization

```typescript
import { PipelineDAGBuilder, DashboardGenerator } from '../pipeline';
import { createComprehensiveAnalysisPipeline } from './pipelines';

const pipeline = createComprehensiveAnalysisPipeline();

// Generate DAG visualization
const dag = PipelineDAGBuilder.buildDAG(pipeline);
const mermaid = PipelineDAGBuilder.toMermaid(dag);
console.log(mermaid);

// Generate performance dashboard
const monitor = new PipelineMonitor();
const traces = monitor.getTraces('comprehensive-analysis');
const dashboard = DashboardGenerator.generateDashboard('comprehensive-analysis', traces);
const ascii = DashboardGenerator.generateASCIIDashboard(dashboard, 'Comprehensive Analysis');
console.log(ascii);
```

## Best Practices

### 1. Choose the Right Pipeline

- **Quick tasks**: Use `QuickPipelines` for simple operations
- **Standard workflows**: Use individual pipelines (`runPropertySearch`, etc.)
- **Complex workflows**: Use composite pipelines (`runComprehensiveAnalysis`)
- **Custom needs**: Build custom pipelines with the pipeline system

### 2. Enable Appropriate Features

- **Development**: Enable logging and metrics
- **Production**: Enable caching, circuit breakers, and monitoring
- **Critical operations**: Enable audit trails and compliance checks
- **Long-running tasks**: Enable checkpointing and state persistence

### 3. Handle Errors Gracefully

```typescript
try {
  const result = await pipeline.execute(input);
  if (!result.success) {
    console.error('Pipeline failed:', result.error);
    // Handle specific error types
    if (result.error?.code === 'VALIDATION_ERROR') {
      // Handle validation errors
    }
  }
} catch (error) {
  console.error('Unexpected error:', error);
  // Handle unexpected errors
}
```

### 4. Monitor Performance

```typescript
import { PipelineMonitor, PerformanceBudget } from '../pipeline';

const monitor = new PipelineMonitor();
const budget = new PerformanceBudget({
  maxDuration: 10000,
  maxMemory: 512 * 1024 * 1024,
});

pipeline.on('complete', (result) => {
  if (!budget.check(result.metrics)) {
    console.warn('Performance budget exceeded!');
  }
});
```

## Migration Guide

### From AgentOrchestrator

```typescript
// Old way (AgentOrchestrator)
import { runMarketResearch } from './pipelines';
const result = await runMarketResearch('Find properties');

// New way (Enterprise Pipelines)
import { runMarketResearchPipeline } from './pipelines';
const result = await runMarketResearchPipeline({
  goal: 'Find properties',
  includeAnalytics: true,
  includeGraph: true,
});
```

### Benefits of Migration

1. **Better Performance**: Parallel execution, caching, and optimization
2. **More Features**: Checkpointing, monitoring, visualization
3. **Better Testing**: Mock stages, assertions, test runners
4. **Better Observability**: Metrics, traces, dashboards
5. **Better Reliability**: Retries, circuit breakers, error recovery

## API Reference

See individual pipeline files for detailed API documentation:

- [Property Search](./propertySearch.ts)
- [Financial Analysis](./financialAnalysis.ts)
- [Compliance Check](./complianceCheck.ts)
- [Graph Analysis](./graphAnalysis.ts)
- [Market Research](./marketResearch.ts)
- [Composite Workflows](./compositeWorkflows.ts)

## Examples

See the [examples directory](../pipeline/examples.ts) for comprehensive examples of all pipeline features.

## Support

For questions or issues:
- Check the [Enterprise Pipeline Documentation](../pipeline/README.md)
- Review the [examples](../pipeline/examples.ts)
- Open an issue on GitHub
