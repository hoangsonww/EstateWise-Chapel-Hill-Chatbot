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
  builder.use(createLoggingMiddleware({ logLevel: 'info' }));
  builder.use(createMetricsMiddleware({ onMetrics: (metrics) => { console.log('[Metrics]', metrics); } }));
  builder.use(createPerformanceMiddleware({ slowThreshold: 15000 }));
  builder.use(
    createCircuitBreakerMiddleware({
      failureThreshold: 5,
      resetTimeout: 300000,
    })
  );

  if (options?.enableCaching) {
    builder.use(
      createCachingMiddleware({
        ttl: 600000, // 10 minutes
        keyGenerator: (context) => `comprehensive:${(context.input as any)?.goal || 'default'}`,
      })
    );
  }

  // Phase 1: Goal parsing and property search
  builder
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage())
    .addStage(createDedupeRankStage());

  // Phase 2: Sequential analysis (parallel execution is handled at stage level)
  builder
    .conditional(
      (context) => !!(context.input as ComprehensiveAnalysisInput).budget,
      createMortgageCalculationStage()
    )
    .conditional(
      (context) => !!(context.input as ComprehensiveAnalysisInput).budget,
      createAffordabilityCalculationStage()
    )
    .conditional(
      (context) => (context.input as ComprehensiveAnalysisInput).preferences?.includeGraph !== false,
      createGraphAnalysisStage()
    )
    .conditional(
      (context) => (context.input as ComprehensiveAnalysisInput).preferences?.includeGraph !== false,
      createAnalyticsSummaryStage()
    )
    .conditional(
      (context) =>
        (context.input as ComprehensiveAnalysisInput).preferences?.includeCompliance !== false,
      createComplianceCheckStage()
    );

  // Phase 3: Map and report generation
  return builder
    .conditional(
      (context) => (context.input as ComprehensiveAnalysisInput).preferences?.includeMap !== false,
      createMapLinkStage()
    )
    .addStage(createReportGenerationStage())
    .stage('format-result', async (context) => {
      const state = context.state as AgentPipelineState;
      const input = context.input as ComprehensiveAnalysisInput;

      const result: ComprehensiveAnalysisResult = {
        properties: (state.propertyResults || []).map((p: any, i: number) => ({
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
              allCompliant: !(state.complianceIssues as any[])?.some((i: any) => i.severity === 'critical'),
              issuesFound: (state.complianceIssues as any[])?.length || 0,
              criticalIssues:
                (state.complianceIssues as any[])?.filter((i: any) => i.severity === 'critical').length || 0,
            }
          : undefined,
        graph: input.preferences?.includeGraph !== false
          ? {
              insights: (state.graphResults as any)?.insights || [],
              patterns: (state.graphResults as any)?.patterns?.length || 0,
              clusters: (state.graphResults as any)?.clusters?.length || 0,
            }
          : undefined,
        analytics: state.analytics,
        mapLink: state.mapLink,
        report: (state.report as any) || '',
        metrics: {
          totalTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: (state.propertyResults as any[])?.length || 0,
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
    .use(createLoggingMiddleware({ logLevel: 'info' }))
    .use(createMetricsMiddleware({ onMetrics: (metrics) => { console.log('[Metrics]', metrics); } }))
    .use(createPerformanceMiddleware({ slowThreshold: 20000 }))
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage())
    .addStage(createDedupeRankStage())
    .addStage(createMortgageCalculationStage())
    .addStage(createAffordabilityCalculationStage())
    .addStage(createGraphAnalysisStage())
    .addStage(createAnalyticsSummaryStage())
    .addStage(createReportGenerationStage())
    .stage('format-result', async (context) => {
      const state = context.state as AgentPipelineState;

      return {
        properties: state.propertyResults,
        investment: {
          roi: (state.investment as any)?.roi,
          cashFlow: (state.investment as any)?.cashFlow,
          appreciation: (state.investment as any)?.appreciation,
        },
        financial: state.affordability,
        market: {
          trends: (state.analytics as any)?.trends,
          competition: (state.analytics as any)?.competition,
        },
        report: state.report,
        metrics: {
          totalTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: (state.propertyResults as any[])?.length || 0,
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
    .use(createLoggingMiddleware({ logLevel: 'info' }))
    .use(createMetricsMiddleware({ onMetrics: (metrics) => { console.log('[Metrics]', metrics); } }))
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage())
    .addStage(createDedupeRankStage())
    .addStage(createMortgageCalculationStage())
    .addStage(createAffordabilityCalculationStage())
    .addStage(createComplianceCheckStage())
    .addStage(createMapLinkStage())
    .addStage(createReportGenerationStage())
    .stage('format-result', async (context) => {
      const state = context.state as AgentPipelineState;

      return {
        properties: state.propertyResults,
        recommendation: state.recommendation,
        scores: state.scores,
        report: state.report,
        metrics: {
          totalTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: (state.propertyResults as any[])?.length || 0,
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

  return result.output as unknown as ComprehensiveAnalysisResult;
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
