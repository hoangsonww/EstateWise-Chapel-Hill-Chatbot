/**
 * Composite Workflows
 *
 * Advanced composite pipelines that combine multiple specialized pipelines
 * for comprehensive property analysis and decision support.
 */

import {
  createPipeline,
  composePipelines,
  createParallelStage,
  createBranchStage,
  createGoalParserStage,
  createPropertySearchStage,
  createDedupeRankStage,
  createGraphAnalysisStage,
  createAnalyticsSummaryStage,
  createMortgageCalculationStage,
  createAffordabilityCalculationStage,
  createComplianceCheckStage,
  createMapLinkStage,
  createReportGenerationStage,
  createLoggingMiddleware,
  createMetricsMiddleware,
  createPerformanceMiddleware,
  createCachingMiddleware,
  createCircuitBreakerMiddleware,
  type AgentPipelineState,
} from '../pipeline/index.js';

import type { PropertySearchInput } from './propertySearch.js';
import type { FinancialAnalysisInput } from './financialAnalysis.js';
import type { ComplianceCheckInput } from './complianceCheck.js';
import type { GraphAnalysisInput } from './graphAnalysis.js';

/**
 * Comprehensive analysis input
 */
export interface ComprehensiveAnalysisInput {
  goal: string;
  budget?: {
    maxPrice: number;
    downPayment?: number;
    annualIncome: number;
    monthlyDebts?: number;
  };
  preferences?: {
    includeGraph?: boolean;
    includeCompliance?: boolean;
    includeMap?: boolean;
    strictCompliance?: boolean;
  };
  options?: {
    maxResults?: number;
    cacheResults?: boolean;
    parallelExecution?: boolean;
  };
}

/**
 * Comprehensive analysis result
 */
export interface ComprehensiveAnalysisResult {
  properties: Array<{
    zpid: string;
    address: string;
    price: number;
    monthlyPayment?: number;
    isAffordable?: boolean;
    complianceScore?: number;
    rank: number;
    [key: string]: unknown;
  }>;
  financial?: {
    affordable: boolean;
    maxBudget: number;
    monthlyBudget: number;
    recommendations: string[];
  };
  compliance?: {
    allCompliant: boolean;
    issuesFound: number;
    criticalIssues: number;
  };
  graph?: {
    insights: string[];
    patterns: number;
    clusters: number;
  };
  analytics?: {
    marketTrends: unknown;
    priceAnalysis: unknown;
    neighborhoodStats: unknown;
  };
  mapLink?: string;
  report: string;
  metrics: {
    totalTime: number;
    propertiesAnalyzed: number;
    stagesCompleted: number;
  };
}

/**
 * Create a comprehensive property analysis pipeline
 *
 * This pipeline combines property search, financial analysis, compliance checking,
 * graph analysis, and reporting into a single unified workflow.
 */
export function createComprehensiveAnalysisPipeline(options?: {
  enableParallel?: boolean;
  enableCaching?: boolean;
}) {
  const builder = createPipeline<ComprehensiveAnalysisInput, AgentPipelineState>()
    .withName('comprehensive-analysis')
    .withDescription('Complete property analysis with search, financial, compliance, and graph analysis');

  // Add middleware
  builder.use(createLoggingMiddleware({ level: 'info' }));
  builder.use(createMetricsMiddleware());
  builder.use(createPerformanceMiddleware({ warnThreshold: 15000 }));
  builder.use(
    createCircuitBreakerMiddleware({
      threshold: 5,
      timeout: 60000,
      resetTimeout: 300000,
    })
  );

  if (options?.enableCaching) {
    builder.use(
      createCachingMiddleware({
        ttl: 600000, // 10 minutes
        keyGenerator: (context) => `comprehensive:${context.input.goal}`,
      })
    );
  }

  // Phase 1: Goal parsing and property search
  builder
    .stage(createGoalParserStage())
    .stage(createPropertySearchStage())
    .stage(createDedupeRankStage());

  // Phase 2: Parallel analysis (if enabled)
  if (options?.enableParallel) {
    builder.stage(
      createParallelStage([
        // Financial analysis
        createPipeline<AgentPipelineState, AgentPipelineState>()
          .conditional(
            (context) => !!(context.input as any).budget,
            createPipeline()
              .stage(createMortgageCalculationStage())
              .stage(createAffordabilityCalculationStage())
              .build()
          )
          .build(),

        // Graph analysis
        createPipeline<AgentPipelineState, AgentPipelineState>()
          .conditional(
            (context) => (context.input as any).preferences?.includeGraph !== false,
            createPipeline()
              .stage(createGraphAnalysisStage({ analysisType: 'all' }))
              .stage(createAnalyticsSummaryStage())
              .build()
          )
          .build(),

        // Compliance check
        createPipeline<AgentPipelineState, AgentPipelineState>()
          .conditional(
            (context) => (context.input as any).preferences?.includeCompliance !== false,
            createComplianceCheckStage({
              strictMode: (context.input as any).preferences?.strictCompliance,
            })
          )
          .build(),
      ])
    );
  } else {
    // Sequential analysis
    builder
      .conditional(
        (context) => !!(context.input as ComprehensiveAnalysisInput).budget,
        createPipeline()
          .stage(createMortgageCalculationStage())
          .stage(createAffordabilityCalculationStage())
          .build()
      )
      .conditional(
        (context) => (context.input as ComprehensiveAnalysisInput).preferences?.includeGraph !== false,
        createPipeline()
          .stage(createGraphAnalysisStage({ analysisType: 'all' }))
          .stage(createAnalyticsSummaryStage())
          .build()
      )
      .conditional(
        (context) =>
          (context.input as ComprehensiveAnalysisInput).preferences?.includeCompliance !== false,
        createComplianceCheckStage({
          strictMode: (context.input as ComprehensiveAnalysisInput).preferences?.strictCompliance,
        })
      );
  }

  // Phase 3: Map and report generation
  return builder
    .conditional(
      (context) => (context.input as ComprehensiveAnalysisInput).preferences?.includeMap !== false,
      createMapLinkStage()
    )
    .stage(createReportGenerationStage())
    .transform(async (context) => {
      const state = context.state as AgentPipelineState;
      const input = context.input as ComprehensiveAnalysisInput;

      const result: ComprehensiveAnalysisResult = {
        properties: (state.properties || []).map((p: any, i: number) => ({
          ...p,
          rank: i + 1,
          monthlyPayment: p.monthlyPayment,
          isAffordable: p.isAffordable,
          complianceScore: p.complianceScore,
        })),
        financial: input.budget
          ? {
              affordable: state.affordability?.isAffordable || false,
              maxBudget: state.affordability?.maxAffordablePrice || 0,
              monthlyBudget: state.affordability?.monthlyBudget || 0,
              recommendations: state.affordability?.recommendations || [],
            }
          : undefined,
        compliance: input.preferences?.includeCompliance !== false
          ? {
              allCompliant: !state.complianceIssues?.some((i: any) => i.severity === 'critical'),
              issuesFound: state.complianceIssues?.length || 0,
              criticalIssues:
                state.complianceIssues?.filter((i: any) => i.severity === 'critical').length || 0,
            }
          : undefined,
        graph: input.preferences?.includeGraph !== false
          ? {
              insights: state.graphData?.insights || [],
              patterns: state.graphData?.patterns?.length || 0,
              clusters: state.graphData?.clusters?.length || 0,
            }
          : undefined,
        analytics: state.analytics,
        mapLink: state.mapLink,
        report: state.report || '',
        metrics: {
          totalTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: state.properties?.length || 0,
          stagesCompleted: context.metadata.completedStages.length,
        },
      };

      return result;
    })
    .build();
}

/**
 * Create an investment analysis workflow
 *
 * Combines property search, financial analysis, market analytics,
 * and ROI calculation for investment decisions.
 */
export function createInvestmentWorkflowPipeline() {
  return createPipeline<ComprehensiveAnalysisInput, AgentPipelineState>()
    .withName('investment-workflow')
    .withDescription('Investment property analysis with ROI and market trends')
    .use(createLoggingMiddleware({ level: 'info' }))
    .use(createMetricsMiddleware())
    .use(createPerformanceMiddleware({ warnThreshold: 20000 }))
    .stage(createGoalParserStage())
    .stage(createPropertySearchStage())
    .stage(createDedupeRankStage())
    .stage(
      createParallelStage([
        // Financial analysis
        createPipeline<AgentPipelineState, AgentPipelineState>()
          .stage(createMortgageCalculationStage())
          .stage(createAffordabilityCalculationStage())
          .build(),

        // Market analysis
        createPipeline<AgentPipelineState, AgentPipelineState>()
          .stage(createGraphAnalysisStage({ analysisType: 'patterns' }))
          .stage(createAnalyticsSummaryStage())
          .build(),
      ])
    )
    .stage(createReportGenerationStage())
    .transform(async (context) => {
      const state = context.state as AgentPipelineState;

      return {
        properties: state.properties,
        investment: {
          roi: state.investment?.roi,
          cashFlow: state.investment?.cashFlow,
          appreciation: state.investment?.appreciation,
        },
        financial: state.affordability,
        market: {
          trends: state.analytics?.trends,
          competition: state.analytics?.competition,
        },
        report: state.report,
        metrics: {
          totalTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: state.properties?.length || 0,
          stagesCompleted: context.metadata.completedStages.length,
        },
      };
    })
    .build();
}

/**
 * Create a decision support workflow
 *
 * Helps users make informed property decisions with comprehensive
 * analysis, scoring, and recommendations.
 */
export function createDecisionSupportWorkflow() {
  return createPipeline<ComprehensiveAnalysisInput, AgentPipelineState>()
    .withName('decision-support')
    .withDescription('Comprehensive decision support for property selection')
    .use(createLoggingMiddleware({ level: 'info' }))
    .use(createMetricsMiddleware())
    .stage(createGoalParserStage())
    .stage(createPropertySearchStage())
    .stage(createDedupeRankStage())
    .stage(
      createBranchStage(
        (context) => {
          const state = context.state as AgentPipelineState;
          const propertyCount = state.properties?.length || 0;

          if (propertyCount === 0) return 'no-results';
          if (propertyCount === 1) return 'single-property';
          if (propertyCount <= 5) return 'few-properties';
          return 'many-properties';
        },
        {
          'no-results': createPipeline()
            .transform(async (context) => {
              const state = context.state as AgentPipelineState;
              state.report = 'No properties found matching your criteria. Please refine your search.';
              return state;
            })
            .build(),

          'single-property': createPipeline()
            .stage(createMortgageCalculationStage())
            .stage(createAffordabilityCalculationStage())
            .stage(createComplianceCheckStage())
            .stage(createGraphAnalysisStage({ analysisType: 'relationships' }))
            .stage(createMapLinkStage())
            .stage(createReportGenerationStage())
            .build(),

          'few-properties': createPipeline()
            .stage(createMortgageCalculationStage())
            .stage(createAffordabilityCalculationStage())
            .stage(createComplianceCheckStage())
            .stage(createMapLinkStage())
            .stage(createReportGenerationStage())
            .build(),

          'many-properties': createPipeline()
            .stage(createMortgageCalculationStage())
            .stage(createAffordabilityCalculationStage())
            .stage(createMapLinkStage())
            .stage(createReportGenerationStage())
            .build(),
        }
      )
    )
    .transform(async (context) => {
      const state = context.state as AgentPipelineState;

      return {
        properties: state.properties,
        recommendation: state.recommendation,
        scores: state.scores,
        report: state.report,
        metrics: {
          totalTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: state.properties?.length || 0,
          stagesCompleted: context.metadata.completedStages.length,
        },
      };
    })
    .build();
}

/**
 * Run comprehensive analysis
 */
export async function runComprehensiveAnalysis(
  input: ComprehensiveAnalysisInput
): Promise<ComprehensiveAnalysisResult> {
  const pipeline = createComprehensiveAnalysisPipeline({
    enableParallel: input.options?.parallelExecution !== false,
    enableCaching: input.options?.cacheResults,
  });

  const result = await pipeline.execute(input);

  if (!result.success) {
    throw new Error(`Comprehensive analysis failed: ${result.error?.message}`);
  }

  return result.output as ComprehensiveAnalysisResult;
}

/**
 * Run investment workflow
 */
export async function runInvestmentWorkflow(
  goal: string,
  budget: ComprehensiveAnalysisInput['budget']
): Promise<any> {
  const pipeline = createInvestmentWorkflowPipeline();

  const result = await pipeline.execute({ goal, budget });

  if (!result.success) {
    throw new Error(`Investment workflow failed: ${result.error?.message}`);
  }

  return result.output;
}

/**
 * Run decision support
 */
export async function runDecisionSupport(
  goal: string,
  budget?: ComprehensiveAnalysisInput['budget']
): Promise<any> {
  const pipeline = createDecisionSupportWorkflow();

  const result = await pipeline.execute({ goal, budget });

  if (!result.success) {
    throw new Error(`Decision support failed: ${result.error?.message}`);
  }

  return result.output;
}
