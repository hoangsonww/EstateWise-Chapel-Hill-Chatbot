/**
 * Pipeline System Examples
 *
 * Comprehensive examples demonstrating various pipeline patterns and features.
 */

import { ToolClient } from "../mcp/ToolClient.js";
import {
  createPipeline,
  createStage,
  createLoggingMiddleware,
  createMetricsMiddleware,
  createPropertySearchPipeline,
  createMarketResearchPipeline,
  composePipelines,
  createParallelStage,
  createBranchStage,
  createRetryStrategy,
  createErrorRecoveryStage,
  PipelineMonitor,
  createMonitoringMiddleware,
  PipelineEventStream,
  type AgentPipelineState,
} from "./index.js";

/**
 * Example 1: Basic pipeline with logging
 */
export async function example1_BasicPipeline() {
  console.log('\n=== Example 1: Basic Pipeline ===\n');

  const pipeline = createPipeline({ name: 'basic-example' })
    .withLogging({ logLevel: 'info' })
    .stage('greet', async (context) => {
      return `Hello, ${context.input}!`;
    })
    .stage('uppercase', async (context) => {
      const greeting = context.state.greet as string;
      return greeting.toUpperCase();
    })
    .build();

  const result = await pipeline.execute('World');
  console.log('Result:', result.output);
  console.log('Success:', result.success);
  console.log('Duration:', result.metrics.totalDuration, 'ms');
}

/**
 * Example 2: Pipeline with custom middleware
 */
export async function example2_CustomMiddleware() {
  console.log('\n=== Example 2: Custom Middleware ===\n');

  const metricsData: any[] = [];

  const pipeline = createPipeline({ name: 'middleware-example' })
    .withLogging({ logLevel: 'debug' })
    .withMetrics({
      onMetrics: (metrics) => {
        console.log('Metrics collected:', metrics);
        metricsData.push(metrics);
      },
    })
    .stage('step1', async () => 'Step 1 complete')
    .stage('step2', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'Step 2 complete';
    })
    .stage('step3', async () => 'Step 3 complete')
    .build();

  await pipeline.execute('test input');
  console.log('\nCollected metrics:', metricsData);
}

/**
 * Example 3: Property search pipeline with templates
 */
export async function example3_PropertySearchTemplate() {
  console.log('\n=== Example 3: Property Search Template ===\n');

  // Initialize tool client (would use real MCP server in production)
  const toolClient = new ToolClient();
  // await toolClient.start(); // Uncomment in production

  const pipeline = createPropertySearchPipeline({
    toolClient,
    enableLogging: true,
    enableMetrics: true,
    onMetrics: (metrics) => {
      console.log('Pipeline metrics:', metrics);
    },
  });

  const result = await pipeline.execute(
    'Find 3 bedroom homes in Chapel Hill under $500k'
  );

  console.log('Search result:', result.output);
  console.log('Success:', result.success);
}

/**
 * Example 4: Parallel execution
 */
export async function example4_ParallelExecution() {
  console.log('\n=== Example 4: Parallel Execution ===\n');

  const stage1 = createStage('fetch-user', async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { id: 1, name: 'John' };
  });

  const stage2 = createStage('fetch-properties', async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [{ zpid: 123 }, { zpid: 456 }];
  });

  const stage3 = createStage('fetch-analytics', async () => {
    await new Promise((resolve) => setTimeout(resolve, 120));
    return { median: 350000, count: 50 };
  });

  const pipeline = createPipeline({ name: 'parallel-example' })
    .withLogging({ logLevel: 'info' })
    .addStage(createParallelStage('fetch-all', [stage1 as any, stage2 as any, stage3 as any]))
    .stage('process-results', async (context) => {
      console.log('All data fetched:', context.state['fetch-all']);
      return 'Processing complete';
    })
    .build();

  const result = await pipeline.execute({});
  console.log('Result:', result.output);
  console.log('Total duration:', result.metrics.totalDuration, 'ms');
}

/**
 * Example 5: Conditional branching
 */
export async function example5_ConditionalBranching() {
  console.log('\n=== Example 5: Conditional Branching ===\n');

  const quickPath = createStage('quick-lookup', async (context) => {
    return `Quick lookup for ZPIDs: ${context.input}`;
  });

  const detailedPath = createStage('detailed-search', async (context) => {
    return `Detailed search for: ${context.input}`;
  });

  const pipeline = createPipeline<string, string, AgentPipelineState>({ name: 'branch-example' })
    .withLogging({ logLevel: 'info' })
    .addStage(
      createBranchStage(
        'route-by-input',
        [
          {
            name: 'has-zpid',
            condition: async (context) => {
              const input = String(context.input);
              return input.toLowerCase().includes('zpid');
            },
            stages: [quickPath],
          },
          {
            name: 'search-query',
            condition: async () => true,
            stages: [detailedPath],
          },
        ]
      )
    )
    .build();

  const result1 = await pipeline.execute('ZPID: 12345');
  console.log('Result 1:', result1.output);

  const result2 = await pipeline.execute('Find homes in Durham');
  console.log('Result 2:', result2.output);
}

/**
 * Example 6: Error recovery with retry
 */
export async function example6_ErrorRecovery() {
  console.log('\n=== Example 6: Error Recovery ===\n');

  let attempts = 0;

  const unreliableStage = createStage('unreliable-operation', async () => {
    attempts++;
    console.log(`Attempt ${attempts}`);

    if (attempts < 3) {
      throw new Error('Temporary failure');
    }

    return 'Success after retries';
  });

  const retryStrategy = createRetryStrategy({
    maxAttempts: 5,
    baseDelay: 500,
    shouldRetry: (error) => error.message.includes('Temporary'),
  });

  const resilientStage = createErrorRecoveryStage(
    unreliableStage,
    retryStrategy
  );

  const pipeline = createPipeline({ name: 'error-recovery-example' })
    .withLogging({ logLevel: 'info' })
    .addStage(resilientStage)
    .build();

  const result = await pipeline.execute({});
  console.log('Result:', result.output);
  console.log('Total attempts:', attempts);
}

/**
 * Example 7: Pipeline composition
 */
export async function example7_PipelineComposition() {
  console.log('\n=== Example 7: Pipeline Composition ===\n');

  // First pipeline: data preparation
  const prepPipeline = createPipeline({ name: 'preparation' })
    .stage('parse', async (context) => {
      console.log('Parsing input...');
      return { parsed: String(context.input).toUpperCase() };
    })
    .stage('validate', async (context) => {
      console.log('Validating...');
      return context.state.parse;
    })
    .build();

  // Second pipeline: processing
  const processPipeline = createPipeline({ name: 'processing' })
    .stage('transform', async (context) => {
      console.log('Transforming...');
      return { ...(context.input as object), transformed: true };
    })
    .stage('enrich', async (context) => {
      console.log('Enriching...');
      return { ...(context.state.transform as object), enriched: true };
    })
    .build();

  // Compose pipelines
  const composedPipeline = composePipelines([prepPipeline, processPipeline], {
    name: 'composed-workflow',
    description: 'Preparation + Processing',
  });

  const result = await composedPipeline.execute('hello world');
  console.log('Final result:', result.output);
}

/**
 * Example 8: Real-time monitoring
 */
export async function example8_Monitoring() {
  console.log('\n=== Example 8: Real-time Monitoring ===\n');

  const monitor = new PipelineMonitor();
  const eventStream = new PipelineEventStream();

  // Subscribe to events
  eventStream.subscribe((event) => {
    console.log(`[Event] ${event.type}:`, event.stageName || '', event.data || '');
  });

  const pipeline = createPipeline({ name: 'monitored-pipeline' })
    .use(createMonitoringMiddleware(monitor))
    .use(eventStream.createMiddleware())
    .stage('stage1', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return 'Stage 1 done';
    })
    .stage('stage2', async () => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      return 'Stage 2 done';
    })
    .stage('stage3', async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return 'Stage 3 done';
    })
    .build();

  // Store pipeline name in metadata for monitoring
  (pipeline as any)._pipelineName = 'monitored-pipeline';

  const result = await pipeline.execute('test');

  // Get metrics
  const metrics = monitor.getMetrics('monitored-pipeline');
  console.log('\nPipeline Metrics:', JSON.stringify(metrics, null, 2));

  // Visualize flow
  console.log('\nPipeline Flow:');
  console.log(monitor.visualizeFlow('monitored-pipeline'));
}

/**
 * Example 9: Caching
 */
export async function example9_Caching() {
  console.log('\n=== Example 9: Caching ===\n');

  let executionCount = 0;

  const pipeline = createPipeline({ name: 'cached-pipeline' })
    .withLogging({ logLevel: 'info' })
    .withCaching({ ttl: 5000 }) // 5 second TTL
    .stage('expensive-operation', async (context) => {
      executionCount++;
      console.log(`Executing expensive operation (count: ${executionCount})`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return `Result for ${context.input}`;
    })
    .build();

  // First execution - should execute
  console.log('\nFirst execution:');
  const result1 = await pipeline.execute('test-input');
  console.log('Result:', result1.output);

  // Second execution - should use cache
  console.log('\nSecond execution (cached):');
  const result2 = await pipeline.execute('test-input');
  console.log('Result:', result2.output);

  // Different input - should execute
  console.log('\nThird execution (different input):');
  const result3 = await pipeline.execute('different-input');
  console.log('Result:', result3.output);

  console.log('\nTotal executions:', executionCount);
}

/**
 * Example 10: Market research pipeline
 */
export async function example10_MarketResearch() {
  console.log('\n=== Example 10: Market Research Pipeline ===\n');

  const toolClient = new ToolClient();
  // await toolClient.start(); // Uncomment in production

  const pipeline = createMarketResearchPipeline({
    toolClient,
    enableLogging: true,
    logLevel: 'info',
    enableMetrics: true,
    onMetrics: (metrics) => {
      console.log('\nPipeline completed in', metrics.duration, 'ms');
      console.log('Stages executed:', metrics.stageMetrics.length);
    },
  });

  const result = await pipeline.execute(
    'Find 3-4 bedroom homes in Chapel Hill, NC under $600k with good schools'
  );

  console.log('\n--- Market Research Report ---');
  console.log(result.output);
  console.log('\nSuccess:', result.success);
  console.log('Duration:', result.metrics.totalDuration, 'ms');
  console.log('Stages completed:', result.metrics.successfulStages);
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await example1_BasicPipeline();
    await example2_CustomMiddleware();
    // await example3_PropertySearchTemplate(); // Requires MCP server
    await example4_ParallelExecution();
    await example5_ConditionalBranching();
    await example6_ErrorRecovery();
    await example7_PipelineComposition();
    await example8_Monitoring();
    await example9_Caching();
    // await example10_MarketResearch(); // Requires MCP server

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples().catch(console.error);
}
