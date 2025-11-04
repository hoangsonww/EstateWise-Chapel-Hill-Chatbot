/**
 * Integration with Existing Agentic AI System
 *
 * Examples showing how to use the new pipeline system with existing
 * agents, orchestrator, and runtime modes.
 */

import { AgentOrchestrator } from "../orchestrator/AgentOrchestrator.js";
import { ToolClient } from "../mcp/ToolClient.js";
import { createPipeline } from "./PipelineBuilder.js";
import { createStage } from "./Stage.js";
import { createLoggingMiddleware, createMetricsMiddleware } from "./middleware.js";
import { PipelineMonitor, createMonitoringMiddleware } from "./monitoring.js";
import type { Agent, AgentContext, AgentMessage } from "../core/types.js";
import type { AgentPipelineState } from "./stages/AgentStages.js";

/**
 * Create a pipeline that wraps the existing AgentOrchestrator
 */
export function createOrchestratorPipeline(
  orchestrator: AgentOrchestrator,
  options?: {
    rounds?: number;
    enableMonitoring?: boolean;
  }
) {
  const rounds = options?.rounds ?? 4;
  const monitor = options?.enableMonitoring ? new PipelineMonitor() : undefined;

  const pipeline = createPipeline<string, AgentMessage[], AgentPipelineState>({
    name: 'orchestrator-pipeline',
    description: 'Pipeline wrapping AgentOrchestrator for round-based execution',
    defaultTimeout: 300000, // 5 minutes
  });

  // Add monitoring if enabled
  if (monitor) {
    pipeline.use(createMonitoringMiddleware(monitor));
  }

  pipeline
    .withLogging({ logLevel: 'info' })
    .withMetrics({
      onMetrics: (metrics) => {
        console.log(`Orchestrator completed in ${metrics.duration}ms`);
      },
    })
    .stage(
      'orchestrate',
      async (context) => {
        const goal = String(context.input);
        const messages = await orchestrator.run(goal, rounds);

        // Update context
        context.state.history = messages;
        context.messages = messages;

        return messages;
      },
      {
        description: 'Execute AgentOrchestrator',
        timeout: 300000,
        retryable: false,
      }
    );

  const built = pipeline.build();

  return {
    pipeline: built,
    monitor,
  };
}

/**
 * Create a hybrid pipeline that uses both orchestrator and custom stages
 */
export function createHybridPipeline(
  orchestrator: AgentOrchestrator,
  toolClient: ToolClient,
  options?: {
    rounds?: number;
  }
) {
  const rounds = options?.rounds ?? 3;

  const pipeline = createPipeline<string, string, AgentPipelineState>({
    name: 'hybrid-pipeline',
    description: 'Hybrid pipeline combining orchestrator with custom stages',
  });

  pipeline
    .withLogging({ logLevel: 'info' })

    // Stage 1: Quick pre-processing
    .stage('preprocess', async (context) => {
      const goal = String(context.input);
      console.log('Preprocessing goal:', goal);

      // Store goal in state
      context.state.goal = goal;

      return { preprocessed: true };
    })

    // Stage 2: Run orchestrator
    .stage(
      'orchestrate',
      async (context) => {
        const goal = context.state.goal;
        const messages = await orchestrator.run(goal, rounds);

        context.messages = messages;
        context.state.history = messages;

        return messages;
      },
      {
        description: 'Run AgentOrchestrator',
        timeout: 180000,
      }
    )

    // Stage 3: Post-processing
    .stage('postprocess', async (context) => {
      const messages = context.state.orchestrate as AgentMessage[];

      // Find reporter message
      const reporterMsg = messages.find((m) => m.from === 'reporter');

      if (reporterMsg) {
        return reporterMsg.content;
      }

      // Fallback: combine all messages
      return messages.map((m) => `[${m.from}] ${m.content}`).join('\n\n');
    });

  return pipeline.build();
}

/**
 * Create a pipeline that integrates individual agents as stages
 */
export function createAgentPipeline(agents: Agent[], toolClient: ToolClient) {
  const pipeline = createPipeline<string, string, AgentPipelineState>({
    name: 'agent-pipeline',
    description: 'Sequential execution of individual agents',
  });

  pipeline.withLogging({ logLevel: 'info' });

  // Initialize context
  pipeline.stage('initialize', async (context) => {
    context.state.goal = String(context.input);
    context.state.history = [];
    return { initialized: true };
  });

  // Add each agent as a stage
  for (const agent of agents) {
    pipeline.stage(
      agent.role,
      async (context) => {
        const agentContext: AgentContext = {
          goal: context.state.goal,
          history: context.state.history || [],
          blackboard: context.blackboard,
        };

        const message = await agent.think(agentContext);

        // Update context
        context.messages.push(message);
        context.state.history = context.messages;

        // Update blackboard if agent produced data
        if (message.data) {
          Object.assign(context.blackboard, message.data);
        }

        return message;
      },
      {
        description: `Execute ${agent.role} agent`,
        timeout: 60000,
        retryable: true,
        maxRetries: 2,
      }
    );
  }

  // Final stage: format output
  pipeline.stage('format-output', async (context) => {
    const history = context.state.history as AgentMessage[];
    return history.map((m) => `**${m.from}**: ${m.content}`).join('\n\n');
  });

  return pipeline.build();
}

/**
 * Create a streaming pipeline that emits events during execution
 */
export function createStreamingPipeline(
  orchestrator: AgentOrchestrator,
  onEvent: (event: any) => void
) {
  const pipeline = createPipeline<string, AgentMessage[]>({
    name: 'streaming-pipeline',
    enableStreaming: true,
  });

  pipeline
    .withLogging({ logLevel: 'debug' })
    .stage('orchestrate-stream', async (context) => {
      const messages: AgentMessage[] = [];

      // Use orchestrator's stream method if available
      if (typeof (orchestrator as any).runStream === 'function') {
        await (orchestrator as any).runStream(
          context.input,
          4,
          (event: any) => {
            onEvent(event);
          }
        );
      } else {
        // Fallback to regular execution
        const msgs = await orchestrator.run(String(context.input), 4);
        messages.push(...msgs);
      }

      return messages;
    });

  return pipeline.build();
}

/**
 * Example: Run hybrid pipeline
 */
export async function exampleHybridPipeline() {
  console.log('\n=== Hybrid Pipeline Example ===\n');

  // Setup (would be real instances in production)
  const toolClient = new ToolClient();
  const orchestrator = new AgentOrchestrator();

  // Register agents (example)
  // orchestrator.register(new PlannerAgent(), new CoordinatorAgent(), ...);

  const pipeline = createHybridPipeline(orchestrator, toolClient, {
    rounds: 3,
  });

  const result = await pipeline.execute(
    'Find 3 bedroom homes in Chapel Hill under $500k'
  );

  console.log('Result:', result.output);
  console.log('Duration:', result.metrics.totalDuration, 'ms');
  console.log('Stages:', result.metrics.stageCount);
}

/**
 * Example: Orchestrator pipeline with monitoring
 */
export async function exampleOrchestratorPipeline() {
  console.log('\n=== Orchestrator Pipeline with Monitoring ===\n');

  const orchestrator = new AgentOrchestrator();
  // Register agents...

  const { pipeline, monitor } = createOrchestratorPipeline(orchestrator, {
    rounds: 5,
    enableMonitoring: true,
  });

  const result = await pipeline.execute(
    'Find investment properties in Durham'
  );

  if (monitor) {
    console.log('\nMetrics:');
    const metrics = monitor.getMetrics('orchestrator-pipeline');
    console.log('- Success rate:', (metrics!.successRate * 100).toFixed(1) + '%');
    console.log('- Avg duration:', metrics!.averageDuration.toFixed(0) + 'ms');

    console.log('\nVisualization:');
    console.log(monitor.visualizeFlow('orchestrator-pipeline'));
  }
}

/**
 * Example: Compare pipeline vs traditional orchestrator
 */
export async function exampleComparisonBenchmark() {
  console.log('\n=== Performance Comparison ===\n');

  const orchestrator = new AgentOrchestrator();
  const goal = 'Find 3 bed homes in Chapel Hill';

  // Traditional orchestrator
  console.log('Running traditional orchestrator...');
  const start1 = Date.now();
  const messages1 = await orchestrator.run(goal, 4);
  const duration1 = Date.now() - start1;
  console.log(`Traditional: ${duration1}ms, ${messages1.length} messages`);

  // Pipeline-wrapped orchestrator
  console.log('\nRunning pipeline-wrapped orchestrator...');
  const { pipeline } = createOrchestratorPipeline(orchestrator, { rounds: 4 });
  const start2 = Date.now();
  const result2 = await pipeline.execute(goal);
  const duration2 = Date.now() - start2;
  console.log(`Pipeline: ${duration2}ms, ${(result2.output as AgentMessage[]).length} messages`);

  console.log('\nOverhead:', (duration2 - duration1), 'ms');
}

/**
 * Integration helper: Convert orchestrator to pipeline
 */
export function orchestratorToPipeline(
  orchestrator: AgentOrchestrator,
  options?: {
    name?: string;
    rounds?: number;
    enableCaching?: boolean;
    enableMonitoring?: boolean;
    enableMetrics?: boolean;
  }
) {
  return createOrchestratorPipeline(orchestrator, {
    rounds: options?.rounds,
    enableMonitoring: options?.enableMonitoring,
  });
}

/**
 * Integration helper: Run agents in pipeline mode
 */
export async function runAgentsAsPipeline(
  agents: Agent[],
  goal: string,
  toolClient: ToolClient,
  options?: {
    enableLogging?: boolean;
    enableMetrics?: boolean;
  }
) {
  const pipeline = createAgentPipeline(agents, toolClient);

  if (options?.enableMetrics) {
    pipeline.addMiddleware(
      createMetricsMiddleware({
        onMetrics: (metrics) => {
          console.log('Agent pipeline metrics:', metrics);
        },
      })
    );
  }

  return pipeline.execute(goal);
}
