/**
 * Pipeline Integration Examples
 *
 * Comprehensive examples showing how to use pipelines with the existing
 * AgentOrchestrator, LangGraph runtime, and CrewAI runtime.
 */

import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator.js';
import { PlannerAgent } from '../agents/PlannerAgent.js';
import { PropertyAnalystAgent } from '../agents/PropertyAnalystAgent.js';
import { ReporterAgent } from '../agents/ReporterAgent.js';

import {
  createPipeline,
  createOrchestratorPipeline,
  createHybridPipeline,
  composePipelines,
  createStage,
  createLoggingMiddleware,
  createMetricsMiddleware,
  PipelineMonitor,
  type AgentPipelineState,
} from '../pipeline/index.js';

import {
  runPropertySearch,
  runFinancialAnalysis,
  runComprehensiveAnalysis,
  createPropertySearchPipeline,
  createFinancialAnalysisPipeline,
  Pipelines,
  QuickPipelines,
} from './index.js';

/* ============================================================================
 * BASIC USAGE EXAMPLES
 * ========================================================================= */

/**
 * Example 1: Simple Property Search
 */
export async function example1_SimplePropertySearch() {
  console.log('=== Example 1: Simple Property Search ===\n');

  const result = await runPropertySearch('3 bedroom houses in Chapel Hill under $500k', {
    maxResults: 10,
    includeMap: true,
  });

  console.log(`Found ${result.properties.length} properties`);
  console.log(`Search took ${result.metrics.searchTime}ms`);
  console.log(`Map: ${result.mapLink}`);
}

/**
 * Example 2: Financial Analysis
 */
export async function example2_FinancialAnalysis() {
  console.log('=== Example 2: Financial Analysis ===\n');

  const result = await runFinancialAnalysis({
    goal: 'Find affordable homes in Durham',
    annualIncome: 120000,
    monthlyDebts: 1500,
    downPayment: 100000,
    includeReport: true,
  });

  console.log(`Affordable: ${result.affordability?.isAffordable}`);
  console.log(`Max price: $${result.affordability?.maxAffordablePrice}`);
  console.log(`Monthly budget: $${result.affordability?.monthlyBudget}`);
}

/**
 * Example 3: Quick Pipelines
 */
export async function example3_QuickPipelines() {
  console.log('=== Example 3: Quick Pipelines ===\n');

  // Calculate mortgage
  const mortgage = await QuickPipelines.calculateMortgage(450000, 90000, 0.065, 30);
  console.log(`Monthly payment: $${mortgage?.monthlyPayment}`);

  // Check affordability
  const affordability = await QuickPipelines.checkAffordability(120000, 1500);
  console.log(`Max affordable: $${affordability?.maxAffordablePrice}`);

  // Check zoning
  const zoning = await QuickPipelines.checkZoning('123 Main St, Chapel Hill, NC');
  console.log(`Zoning compliant: ${zoning.compliant}`);
}

/**
 * Example 4: Comprehensive Analysis
 */
export async function example4_ComprehensiveAnalysis() {
  console.log('=== Example 4: Comprehensive Analysis ===\n');

  const result = await runComprehensiveAnalysis({
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

  console.log(`Found ${result.properties.length} properties`);
  console.log(`Financial check: ${result.financial?.affordable ? 'PASS' : 'FAIL'}`);
  console.log(`Compliance: ${result.compliance?.allCompliant ? 'PASS' : 'FAIL'}`);
  console.log(`Graph insights: ${result.graph?.insights.length || 0}`);
  console.log(`Total time: ${result.metrics.totalTime}ms`);
}

/* ============================================================================
 * INTEGRATION WITH AGENTORCHESTRATOR
 * ========================================================================= */

/**
 * Example 5: Using AgentOrchestrator with Pipelines
 */
export async function example5_OrchestratorIntegration() {
  console.log('=== Example 5: AgentOrchestrator Integration ===\n');

  // Create orchestrator
  const orchestrator = new AgentOrchestrator().register(
    new PlannerAgent(),
    new PropertyAnalystAgent(),
    new ReporterAgent()
  );

  // Wrap orchestrator in a pipeline
  const orchestratorPipeline = createOrchestratorPipeline(orchestrator, {
    maxRounds: 5,
    enableLogging: true,
  });

  // Execute
  const result = await orchestratorPipeline.execute({
    goal: 'Find properties near Duke University',
  });

  console.log('Success:', result.success);
  console.log('Rounds executed:', result.metadata?.rounds);
}

/**
 * Example 6: Hybrid Pipeline (Orchestrator + Custom Stages)
 */
export async function example6_HybridPipeline() {
  console.log('=== Example 6: Hybrid Pipeline ===\n');

  const orchestrator = new AgentOrchestrator().register(
    new PlannerAgent(),
    new PropertyAnalystAgent()
  );

  // Create custom pre-processing stage
  const preprocessingStage = createStage({
    name: 'preprocessing',
    execute: async (context) => {
      console.log('Pre-processing input...');
      // Normalize and validate input
      const state = context.state as AgentPipelineState;
      state.preprocessed = true;
      return { preprocessed: true };
    },
  });

  // Create custom post-processing stage
  const postprocessingStage = createStage({
    name: 'postprocessing',
    execute: async (context) => {
      console.log('Post-processing results...');
      const state = context.state as AgentPipelineState;
      // Format and enrich results
      state.formatted = true;
      return { formatted: true };
    },
  });

  // Create hybrid pipeline
  const hybridPipeline = createHybridPipeline(orchestrator, {
    preStages: [preprocessingStage],
    postStages: [postprocessingStage],
    maxRounds: 5,
  });

  const result = await hybridPipeline.execute({
    goal: 'Analyze Chapel Hill market',
  });

  console.log('Success:', result.success);
  console.log('Pre-processed:', result.context.state.preprocessed);
  console.log('Formatted:', result.context.state.formatted);
}

/**
 * Example 7: Composing Orchestrator with Specialized Pipelines
 */
export async function example7_OrchestratorComposition() {
  console.log('=== Example 7: Orchestrator Composition ===\n');

  const orchestrator = new AgentOrchestrator().register(
    new PlannerAgent(),
    new PropertyAnalystAgent()
  );

  // Compose pipelines: Property Search -> Orchestrator -> Financial Analysis
  const composedPipeline = composePipelines([
    createPropertySearchPipeline(),
    createOrchestratorPipeline(orchestrator, { maxRounds: 3 }),
    createFinancialAnalysisPipeline(),
  ]);

  const result = await composedPipeline.execute({
    goal: 'Find and analyze affordable homes',
    annualIncome: 120000,
  });

  console.log('Success:', result.success);
  console.log('Properties found:', result.context.state.properties?.length);
  console.log('Financial analysis complete:', !!result.context.state.affordability);
}

/* ============================================================================
 * INTEGRATION WITH LANGGRAPH RUNTIME
 * ========================================================================= */

/**
 * Example 8: LangGraph Integration
 */
export async function example8_LangGraphIntegration() {
  console.log('=== Example 8: LangGraph Integration ===\n');

  // Create a LangGraph-compatible stage
  const langGraphStage = createStage({
    name: 'langgraph-analysis',
    description: 'Process data using LangGraph runtime',
    execute: async (context) => {
      console.log('Executing LangGraph runtime...');

      // In a real implementation, this would:
      // 1. Convert pipeline context to LangGraph state
      // 2. Execute LangGraph workflow
      // 3. Convert LangGraph results back to pipeline state

      const state = context.state as AgentPipelineState;

      // Simulate LangGraph processing
      const langGraphResult = {
        analyzed: true,
        insights: [
          'Property prices trending upward',
          'High demand in downtown area',
          'Good investment opportunity',
        ],
        confidence: 0.85,
      };

      // Add LangGraph results to state
      state.langGraphAnalysis = langGraphResult;

      return langGraphResult;
    },
  });

  // Create pipeline with LangGraph stage
  const pipeline = createPipeline<{ goal: string }, AgentPipelineState>()
    .withName('langgraph-pipeline')
    .use(createLoggingMiddleware({ level: 'info' }))
    .stage(
      createStage({
        name: 'prepare-data',
        execute: async (context) => {
          const state = context.state as AgentPipelineState;
          state.prepared = true;
          return { prepared: true };
        },
      })
    )
    .stage(langGraphStage)
    .stage(
      createStage({
        name: 'process-results',
        execute: async (context) => {
          const state = context.state as AgentPipelineState;
          console.log('LangGraph insights:', state.langGraphAnalysis?.insights);
          return { processed: true };
        },
      })
    )
    .build();

  const result = await pipeline.execute({ goal: 'Analyze market trends' });

  console.log('Success:', result.success);
  console.log('LangGraph analysis:', result.context.state.langGraphAnalysis);
}

/**
 * Example 9: LangGraph ReAct Agent Integration
 */
export async function example9_LangGraphReActAgent() {
  console.log('=== Example 9: LangGraph ReAct Agent ===\n');

  // Create a ReAct agent stage
  const reactAgentStage = createStage({
    name: 'react-agent',
    description: 'ReAct agent with tool calling',
    execute: async (context) => {
      console.log('Executing ReAct agent...');

      // Simulate ReAct agent loop: Thought -> Action -> Observation
      const state = context.state as AgentPipelineState;

      const reactLoop = [
        {
          thought: 'I need to search for properties in the specified area',
          action: 'search_properties',
          observation: 'Found 15 properties',
        },
        {
          thought: 'I should analyze the price trends',
          action: 'analyze_prices',
          observation: 'Average price is $450k, trending up 5%',
        },
        {
          thought: 'I have enough information to provide a summary',
          action: 'generate_summary',
          observation: 'Summary generated successfully',
        },
      ];

      state.reactLoop = reactLoop;
      state.finalAnswer =
        'Found 15 properties with an average price of $450k. Market is trending upward at 5% annually.';

      return { completed: true };
    },
  });

  // Create pipeline with ReAct agent
  const pipeline = createPropertySearchPipeline().stage(reactAgentStage).build();

  const result = await pipeline.execute({ goal: 'Find properties in Durham' });

  console.log('Success:', result.success);
  console.log('ReAct loop:', result.context.state.reactLoop);
  console.log('Final answer:', result.context.state.finalAnswer);
}

/* ============================================================================
 * INTEGRATION WITH CREWAI RUNTIME
 * ========================================================================= */

/**
 * Example 10: CrewAI Integration
 */
export async function example10_CrewAIIntegration() {
  console.log('=== Example 10: CrewAI Integration ===\n');

  // Create a CrewAI-compatible stage
  const crewAIStage = createStage({
    name: 'crewai-crew',
    description: 'Execute CrewAI crew for collaborative analysis',
    execute: async (context) => {
      console.log('Executing CrewAI crew...');

      // In a real implementation, this would:
      // 1. Spawn Python process with CrewAI
      // 2. Pass pipeline context as JSON
      // 3. Execute crew with multiple agents
      // 4. Collect and parse results

      const state = context.state as AgentPipelineState;

      // Simulate CrewAI crew execution
      const crewResult = {
        agents: [
          {
            name: 'Property Researcher',
            role: 'Research properties and market data',
            output: 'Completed property research for Chapel Hill area',
          },
          {
            name: 'Financial Analyst',
            role: 'Analyze financial aspects',
            output: 'Calculated affordability and mortgage options',
          },
          {
            name: 'Report Writer',
            role: 'Generate comprehensive report',
            output: 'Generated detailed market analysis report',
          },
        ],
        finalReport: 'Comprehensive market analysis completed successfully',
        collaboration: 'High',
      };

      state.crewAIResult = crewResult;

      return crewResult;
    },
  });

  // Create pipeline with CrewAI stage
  const pipeline = createPipeline<{ goal: string }, AgentPipelineState>()
    .withName('crewai-pipeline')
    .use(createLoggingMiddleware({ level: 'info' }))
    .use(createMetricsMiddleware())
    .stage(
      createStage({
        name: 'prepare-crew-input',
        execute: async (context) => {
          const state = context.state as AgentPipelineState;
          state.crewInput = {
            goal: context.input.goal,
            context: 'Chapel Hill real estate market',
            tools: ['search_properties', 'calculate_mortgage', 'generate_report'],
          };
          return { prepared: true };
        },
      })
    )
    .stage(crewAIStage)
    .stage(
      createStage({
        name: 'process-crew-output',
        execute: async (context) => {
          const state = context.state as AgentPipelineState;
          console.log('Crew agents:', state.crewAIResult?.agents?.length);
          console.log('Final report:', state.crewAIResult?.finalReport);
          return { processed: true };
        },
      })
    )
    .build();

  const result = await pipeline.execute({ goal: 'Analyze market opportunities' });

  console.log('Success:', result.success);
  console.log('Crew result:', result.context.state.crewAIResult);
}

/* ============================================================================
 * ADVANCED INTEGRATION PATTERNS
 * ========================================================================= */

/**
 * Example 11: Multi-Runtime Pipeline
 */
export async function example11_MultiRuntimePipeline() {
  console.log('=== Example 11: Multi-Runtime Pipeline ===\n');

  const orchestrator = new AgentOrchestrator().register(
    new PlannerAgent(),
    new PropertyAnalystAgent()
  );

  // Create a pipeline that uses all three runtimes
  const multiRuntimePipeline = createPipeline<{ goal: string }, AgentPipelineState>()
    .withName('multi-runtime')
    .use(createLoggingMiddleware({ level: 'info' }))
    .use(createMetricsMiddleware())
    // Phase 1: AgentOrchestrator for planning
    .stage(
      createStage({
        name: 'orchestrator-planning',
        execute: async (context) => {
          console.log('Phase 1: AgentOrchestrator Planning');
          const result = await orchestrator.run(context.input.goal, 2);
          const state = context.state as AgentPipelineState;
          state.plan = result;
          return { planned: true };
        },
      })
    )
    // Phase 2: LangGraph for analysis
    .stage(
      createStage({
        name: 'langgraph-analysis',
        execute: async (context) => {
          console.log('Phase 2: LangGraph Analysis');
          const state = context.state as AgentPipelineState;
          state.analysis = {
            insights: ['Market trending up', 'High demand area'],
            confidence: 0.9,
          };
          return { analyzed: true };
        },
      })
    )
    // Phase 3: CrewAI for collaborative decision-making
    .stage(
      createStage({
        name: 'crewai-decision',
        execute: async (context) => {
          console.log('Phase 3: CrewAI Collaborative Decision');
          const state = context.state as AgentPipelineState;
          state.decision = {
            recommendation: 'Strong buy signal',
            confidence: 'High',
            reasoning: 'All agents agree on positive market conditions',
          };
          return { decided: true };
        },
      })
    )
    .build();

  const result = await multiRuntimePipeline.execute({
    goal: 'Should I invest in Chapel Hill real estate?',
  });

  console.log('Success:', result.success);
  console.log('Plan:', result.context.state.plan ? 'Generated' : 'None');
  console.log('Analysis:', result.context.state.analysis);
  console.log('Decision:', result.context.state.decision);
}

/**
 * Example 12: Monitored Pipeline with Dashboards
 */
export async function example12_MonitoredPipeline() {
  console.log('=== Example 12: Monitored Pipeline with Dashboards ===\n');

  const monitor = new PipelineMonitor();
  const pipeline = Pipelines.composite.createComprehensiveAnalysis({
    enableParallel: true,
  });

  // Subscribe to pipeline events
  pipeline.on('stage:start', (event) => {
    console.log(`[START] ${event.stageName}`);
  });

  pipeline.on('stage:complete', (event) => {
    console.log(`[COMPLETE] ${event.stageName} (${event.duration}ms)`);
  });

  pipeline.on('stage:error', (event) => {
    console.error(`[ERROR] ${event.stageName}:`, event.error);
  });

  // Execute pipeline
  for (let i = 0; i < 5; i++) {
    await pipeline.execute({
      goal: `Analysis run ${i + 1}`,
      budget: { maxPrice: 500000, annualIncome: 120000 },
    });
  }

  // Get metrics
  const metrics = monitor.getMetrics('comprehensive-analysis');
  console.log('\nMetrics:');
  console.log('Total executions:', metrics.totalExecutions);
  console.log('Success rate:', (metrics.successRate * 100).toFixed(1) + '%');
  console.log('Avg duration:', metrics.averageDuration.toFixed(0) + 'ms');

  // Get traces for dashboard
  const traces = monitor.getTraces('comprehensive-analysis');
  console.log('Total traces:', traces.length);
}

/* ============================================================================
 * MAIN FUNCTION TO RUN ALL EXAMPLES
 * ========================================================================= */

export async function runAllExamples() {
  console.log('\n' + '='.repeat(80));
  console.log('ESTATEWISE PIPELINE INTEGRATION EXAMPLES');
  console.log('='.repeat(80) + '\n');

  const examples = [
    example1_SimplePropertySearch,
    example2_FinancialAnalysis,
    example3_QuickPipelines,
    example4_ComprehensiveAnalysis,
    example5_OrchestratorIntegration,
    example6_HybridPipeline,
    example7_OrchestratorComposition,
    example8_LangGraphIntegration,
    example9_LangGraphReActAgent,
    example10_CrewAIIntegration,
    example11_MultiRuntimePipeline,
    example12_MonitoredPipeline,
  ];

  for (const example of examples) {
    try {
      await example();
      console.log('\n');
    } catch (error) {
      console.error('Example failed:', error);
      console.log('\n');
    }
  }

  console.log('='.repeat(80));
  console.log('ALL EXAMPLES COMPLETED');
  console.log('='.repeat(80) + '\n');
}

// Uncomment to run examples
// runAllExamples().catch(console.error);
