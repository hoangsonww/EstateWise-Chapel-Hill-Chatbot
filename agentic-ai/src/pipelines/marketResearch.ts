/**
 * Market Research Pipeline
 *
 * Comprehensive market research pipeline combining property search,
 * analytics, graph analysis, and market trend analysis.
 *
 * This module provides both the legacy AgentOrchestrator-based approach
 * and the new enterprise pipeline system approach for backward compatibility.
 */

import { AgentOrchestrator } from "../orchestrator/AgentOrchestrator.js";
import { PlannerAgent } from "../agents/PlannerAgent.js";
import { CoordinatorAgent } from "../agents/CoordinatorAgent.js";
import { PropertyAnalystAgent } from "../agents/PropertyAnalystAgent.js";
import { GraphAnalystAgent } from "../agents/GraphAnalystAgent.js";
import { MapAnalystAgent } from "../agents/MapAnalystAgent.js";
import { FinanceAnalystAgent } from "../agents/FinanceAnalystAgent.js";
import { ReporterAgent } from "../agents/ReporterAgent.js";
import { DedupeRankingAgent } from "../agents/DedupeRankingAgent.js";
import { ComplianceAgent } from "../agents/ComplianceAgent.js";
import { ZpidFinderAgent } from "../agents/ZpidFinderAgent.js";
import { AnalyticsAnalystAgent } from "../agents/AnalyticsAnalystAgent.js";

// New enterprise pipeline imports
import {
  createPipeline,
  createGoalParserStage,
  createPropertySearchStage,
  createAnalyticsSummaryStage,
  createGraphAnalysisStage,
  createGroupByZipStage,
  createDedupeRankStage,
  createMapLinkStage,
  createReportGenerationStage,
  createLoggingMiddleware,
  createMetricsMiddleware,
  createPerformanceMiddleware,
  createCachingMiddleware,
  type AgentPipelineState,
} from '../pipeline/index.js';

/**
 * Market research input
 */
export interface MarketResearchInput {
  goal: string;
  includeAnalytics?: boolean;
  includeGraph?: boolean;
  includeFinancial?: boolean;
  groupByZip?: boolean;
  maxResults?: number;
  cacheResults?: boolean;
}

/**
 * Market research result
 */
export interface MarketResearchResult {
  properties: Array<{
    zpid: string;
    address: string;
    price: number;
    [key: string]: unknown;
  }>;
  analytics?: {
    trends: unknown;
    statistics: unknown;
    insights: string[];
  };
  graphData?: {
    patterns: unknown[];
    insights: string[];
  };
  zipGroups?: Record<string, any[]>;
  mapLink?: string;
  report: string;
  metrics: {
    totalTime: number;
    propertiesFound: number;
    analyticsGenerated: boolean;
  };
}

/**
 * Create an enterprise market research pipeline
 *
 * This is the new, enhanced version using the enterprise pipeline system.
 */
export function createMarketResearchPipeline(options?: {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  enableAnalytics?: boolean;
  enableGraph?: boolean;
}) {
  const builder = createPipeline<MarketResearchInput, AgentPipelineState>()
    .withName('market-research')
    .withDescription('Comprehensive market research with analytics and insights');

  // Add middleware
  if (options?.enableLogging !== false) {
    builder.use(createLoggingMiddleware({ logLevel: 'info' }));
  }

  if (options?.enableMetrics !== false) {
    builder.use(createMetricsMiddleware({
      onMetrics: (metrics) => {
        console.log('[Market Research Metrics]', metrics);
      }
    }));
  }

  builder.use(createPerformanceMiddleware({ slowThreshold: 15000 }));

  if (options?.enableCaching) {
    builder.use(
      createCachingMiddleware({
        ttl: 600000, // 10 minutes
        keyGenerator: (context) => `market-research:${(context.input as MarketResearchInput).goal}`,
      })
    );
  }

  // Build pipeline stages
  return builder
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage())
    .addStage(createDedupeRankStage())
    .conditional(
      (context) => (context.input as MarketResearchInput).groupByZip !== false,
      createGroupByZipStage()
    )
    .conditional(
      (context) => (context.input as MarketResearchInput).includeAnalytics !== false,
      createAnalyticsSummaryStage()
    )
    .conditional(
      (context) => (context.input as MarketResearchInput).includeGraph !== false,
      createGraphAnalysisStage()
    )
    .addStage(createMapLinkStage())
    .addStage(createReportGenerationStage())
    .stage('format-result', async (context) => {
      const state = context.state as AgentPipelineState;
      const input = context.input as MarketResearchInput;

      const result: MarketResearchResult = {
        properties: state.propertyResults || [],
        analytics: input.includeAnalytics !== false ? state.analytics : undefined,
        graphData: input.includeGraph !== false ? state.graphResults : undefined,
        zipGroups: input.groupByZip !== false ? state.zipGroups : undefined,
        mapLink: state.mapLink,
        report: state.report || '',
        metrics: {
          totalTime: Date.now() - context.metadata.startTime,
          propertiesFound: state.propertyResults?.length || 0,
          analyticsGenerated: !!state.analytics,
        },
      };

      return result;
    })
    .build();
}

/**
 * Run market research using the new enterprise pipeline system
 *
 * This is the recommended approach for new code.
 */
export async function runMarketResearchPipeline(
  input: MarketResearchInput
): Promise<MarketResearchResult> {
  const pipeline = createMarketResearchPipeline({
    enableLogging: true,
    enableMetrics: true,
    enableCaching: input.cacheResults,
    enableAnalytics: input.includeAnalytics !== false,
    enableGraph: input.includeGraph !== false,
  });

  const result = await pipeline.execute(input);

  if (!result.success) {
    throw new Error(`Market research failed: ${result.error?.message}`);
  }

  return result.output as MarketResearchResult;
}

/**
 * Run the default orchestrator pipeline for a single goal.
 *
 * LEGACY: This function is maintained for backward compatibility.
 * New code should use `runMarketResearchPipeline` instead.
 *
 * @deprecated Use runMarketResearchPipeline for new code
 */
export async function runMarketResearch(goal: string) {
  const orchestrator = new AgentOrchestrator().register(
    new PlannerAgent(),
    new CoordinatorAgent(),
    new ZpidFinderAgent(),
    new PropertyAnalystAgent(),
    new AnalyticsAnalystAgent(),
    new GraphAnalystAgent(),
    new DedupeRankingAgent(),
    new MapAnalystAgent(),
    new FinanceAnalystAgent(),
    new ComplianceAgent(),
    new ReporterAgent(),
  );
  return await orchestrator.run(goal, 5);
}

/**
 * Quick market overview pipeline
 *
 * Faster version with reduced analysis for quick market snapshots.
 */
export function createQuickMarketOverviewPipeline() {
  return createPipeline<MarketResearchInput, AgentPipelineState>()
    .withName('quick-market-overview')
    .withDescription('Fast market overview with essential metrics')
    .use(createLoggingMiddleware({ logLevel: 'warn' }))
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage({ maxResults: 20 }))
    .addStage(createGroupByZipStage())
    .addStage(createAnalyticsSummaryStage())
    .addStage(createReportGenerationStage())
    .stage('format-result', async (context) => {
      const state = context.state as AgentPipelineState;

      return {
        properties: state.propertyResults || [],
        analytics: state.analytics,
        zipGroups: state.zipGroups,
        report: state.report,
        metrics: {
          totalTime: Date.now() - context.metadata.startTime,
          propertiesFound: state.propertyResults?.length || 0,
          analyticsGenerated: !!state.analytics,
        },
      };
    })
    .build();
}

/**
 * Deep market analysis pipeline
 *
 * Comprehensive analysis with all features enabled for in-depth research.
 */
export function createDeepMarketAnalysisPipeline() {
  return createPipeline<MarketResearchInput, AgentPipelineState>()
    .withName('deep-market-analysis')
    .withDescription('In-depth market analysis with comprehensive insights')
    .use(createLoggingMiddleware({ logLevel: 'info' }))
    .use(createMetricsMiddleware({
      onMetrics: (metrics) => {
        console.log('[Deep Market Analysis Metrics]', metrics);
      }
    }))
    .use(createPerformanceMiddleware({ slowThreshold: 30000 }))
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage())
    .addStage(createDedupeRankStage())
    .addStage(createGroupByZipStage())
    .addStage(createAnalyticsSummaryStage())
    .addStage(createGraphAnalysisStage())
    .addStage(createMapLinkStage())
    .addStage(createReportGenerationStage())
    .stage('format-result', async (context) => {
      const state = context.state as AgentPipelineState;

      return {
        properties: state.propertyResults || [],
        analytics: state.analytics,
        graphData: state.graphResults,
        zipGroups: state.zipGroups,
        mapLink: state.mapLink,
        report: state.report,
        metrics: {
          totalTime: Date.now() - context.metadata.startTime,
          propertiesFound: state.propertyResults?.length || 0,
          analyticsGenerated: !!state.analytics,
        },
      };
    })
    .build();
}
