/**
 * Pipeline Templates
 *
 * Pre-configured pipeline templates for common EstateWise use cases.
 */

import { createPipeline } from "./PipelineBuilder.js";
import {
  createGoalParserStage,
  createPropertySearchStage,
  createAnalyticsSummaryStage,
  createGroupByZipStage,
  createDedupeRankStage,
  createGraphAnalysisStage,
  createMapLinkStage,
  createMortgageCalculationStage,
  createAffordabilityCalculationStage,
  createComplianceCheckStage,
  createReportGenerationStage,
  type AgentPipelineState,
} from "./stages/AgentStages.js";
import {
  createLoggingMiddleware,
  createMetricsMiddleware,
} from "./middleware.js";
import type { Pipeline } from "./types.js";

export interface TemplateOptions {
  toolClient?: any;
  enableLogging?: boolean;
  enableMetrics?: boolean;
  onMetrics?: (metrics: any) => void;
  logLevel?: "debug" | "info" | "warn" | "error";
}

/**
 * Basic property search pipeline
 * - Parse goal
 * - Search properties
 * - Deduplicate and rank
 * - Generate report
 */
export function createPropertySearchPipeline(
  options: TemplateOptions = {},
): Pipeline<string, string, AgentPipelineState> {
  const builder = createPipeline<string, string, AgentPipelineState>({
    name: "property-search",
    description: "Basic property search pipeline",
    defaultTimeout: 60000,
    enableCaching: true,
    cacheTTL: 300000, // 5 minutes
  });

  // Add middleware
  if (options.enableLogging !== false) {
    builder.use(
      createLoggingMiddleware({
        logLevel: options.logLevel || "info",
      }),
    );
  }

  if (options.enableMetrics && options.onMetrics) {
    builder.use(
      createMetricsMiddleware({
        onMetrics: options.onMetrics,
      }),
    );
  }

  // Add stages
  builder
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage({ toolClient: options.toolClient }))
    .addStage(createDedupeRankStage({ maxResults: 50 }))
    .addStage(createComplianceCheckStage())
    .addStage(createReportGenerationStage());

  return builder.build();
}

/**
 * Comprehensive market research pipeline
 * - Parse goal
 * - Search properties
 * - Analytics summary
 * - Group by ZIP
 * - Deduplicate and rank
 * - Graph analysis
 * - Map link
 * - Compliance check
 * - Generate report
 */
export function createMarketResearchPipeline(
  options: TemplateOptions = {},
): Pipeline<string, string, AgentPipelineState> {
  const builder = createPipeline<string, string, AgentPipelineState>({
    name: "market-research",
    description: "Comprehensive market research pipeline",
    defaultTimeout: 120000,
    enableCaching: true,
    cacheTTL: 600000, // 10 minutes
  });

  // Add middleware
  if (options.enableLogging !== false) {
    builder.use(
      createLoggingMiddleware({
        logLevel: options.logLevel || "info",
      }),
    );
  }

  if (options.enableMetrics && options.onMetrics) {
    builder.use(
      createMetricsMiddleware({
        onMetrics: options.onMetrics,
      }),
    );
  }

  // Add stages
  builder
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage({ toolClient: options.toolClient }))
    .addStage(createAnalyticsSummaryStage({ toolClient: options.toolClient }))
    .addStage(createGroupByZipStage({ toolClient: options.toolClient }))
    .addStage(createDedupeRankStage({ maxResults: 100 }))
    .addStage(createGraphAnalysisStage({ toolClient: options.toolClient }))
    .addStage(createMapLinkStage({ toolClient: options.toolClient }))
    .addStage(createComplianceCheckStage())
    .addStage(createReportGenerationStage());

  return builder.build();
}

/**
 * Financial analysis pipeline
 * - Parse goal
 * - Search properties
 * - Mortgage calculation
 * - Affordability calculation
 * - Analytics summary
 * - Deduplicate and rank
 * - Generate report
 */
export function createFinancialAnalysisPipeline(
  options: TemplateOptions & { defaultIncome?: number } = {},
): Pipeline<string, string, AgentPipelineState> {
  const builder = createPipeline<string, string, AgentPipelineState>({
    name: "financial-analysis",
    description: "Financial analysis pipeline with mortgage and affordability",
    defaultTimeout: 90000,
    enableCaching: true,
    cacheTTL: 300000, // 5 minutes
  });

  // Add middleware
  if (options.enableLogging !== false) {
    builder.use(
      createLoggingMiddleware({
        logLevel: options.logLevel || "info",
      }),
    );
  }

  if (options.enableMetrics && options.onMetrics) {
    builder.use(
      createMetricsMiddleware({
        onMetrics: options.onMetrics,
      }),
    );
  }

  // Add stages
  builder
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage({ toolClient: options.toolClient }))
    .addStage(
      createMortgageCalculationStage({ toolClient: options.toolClient }),
    )
    .addStage(
      createAffordabilityCalculationStage({
        toolClient: options.toolClient,
        defaultIncome: options.defaultIncome,
      }),
    )
    .addStage(createAnalyticsSummaryStage({ toolClient: options.toolClient }))
    .addStage(createDedupeRankStage({ maxResults: 50 }))
    .addStage(createComplianceCheckStage())
    .addStage(createReportGenerationStage());

  return builder.build();
}

/**
 * Quick lookup pipeline
 * - Parse goal (extract ZPIDs)
 * - Map link generation
 * - Generate report
 */
export function createQuickLookupPipeline(
  options: TemplateOptions = {},
): Pipeline<string, string, AgentPipelineState> {
  const builder = createPipeline<string, string, AgentPipelineState>({
    name: "quick-lookup",
    description: "Quick property lookup by ZPID",
    defaultTimeout: 30000,
    enableCaching: true,
    cacheTTL: 3600000, // 1 hour
  });

  // Add middleware
  if (options.enableLogging !== false) {
    builder.use(
      createLoggingMiddleware({
        logLevel: options.logLevel || "info",
      }),
    );
  }

  if (options.enableMetrics && options.onMetrics) {
    builder.use(
      createMetricsMiddleware({
        onMetrics: options.onMetrics,
      }),
    );
  }

  // Add stages
  builder
    .addStage(createGoalParserStage())
    .addStage(createMapLinkStage({ toolClient: options.toolClient }))
    .addStage(createReportGenerationStage());

  return builder.build();
}

/**
 * Graph analysis pipeline
 * - Parse goal
 * - Search or extract ZPIDs
 * - Graph analysis
 * - Map link
 * - Generate report
 */
export function createGraphAnalysisPipeline(
  options: TemplateOptions = {},
): Pipeline<string, string, AgentPipelineState> {
  const builder = createPipeline<string, string, AgentPipelineState>({
    name: "graph-analysis",
    description: "Property relationship and similarity analysis",
    defaultTimeout: 90000,
    enableCaching: true,
    cacheTTL: 600000, // 10 minutes
  });

  // Add middleware
  if (options.enableLogging !== false) {
    builder.use(
      createLoggingMiddleware({
        logLevel: options.logLevel || "info",
      }),
    );
  }

  if (options.enableMetrics && options.onMetrics) {
    builder.use(
      createMetricsMiddleware({
        onMetrics: options.onMetrics,
      }),
    );
  }

  // Add stages
  builder
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage({ toolClient: options.toolClient }))
    .addStage(createDedupeRankStage({ maxResults: 20 }))
    .addStage(createGraphAnalysisStage({ toolClient: options.toolClient }))
    .addStage(createMapLinkStage({ toolClient: options.toolClient }))
    .addStage(createComplianceCheckStage())
    .addStage(createReportGenerationStage());

  return builder.build();
}

/**
 * Parallel search pipeline - searches multiple criteria in parallel
 * - Parse goal
 * - Parallel search (multiple filters)
 * - Merge and deduplicate
 * - Analytics
 * - Generate report
 */
export function createParallelSearchPipeline(
  options: TemplateOptions & { searchCriteria?: Array<any> } = {},
): Pipeline<string, string, AgentPipelineState> {
  const builder = createPipeline<string, string, AgentPipelineState>({
    name: "parallel-search",
    description: "Parallel property search with multiple criteria",
    defaultTimeout: 120000,
    maxConcurrency: 3,
    enableCaching: true,
    cacheTTL: 300000, // 5 minutes
  });

  // Add middleware
  if (options.enableLogging !== false) {
    builder.use(
      createLoggingMiddleware({
        logLevel: options.logLevel || "info",
      }),
    );
  }

  if (options.enableMetrics && options.onMetrics) {
    builder.use(
      createMetricsMiddleware({
        onMetrics: options.onMetrics,
      }),
    );
  }

  // Add stages
  builder
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage({ toolClient: options.toolClient }))
    .addStage(createDedupeRankStage({ maxResults: 100 }))
    .addStage(createAnalyticsSummaryStage({ toolClient: options.toolClient }))
    .addStage(createComplianceCheckStage())
    .addStage(createReportGenerationStage());

  return builder.build();
}

/**
 * Get a pipeline template by name
 */
export function getPipelineTemplate(
  name: string,
  options: TemplateOptions = {},
): Pipeline<string, string, AgentPipelineState> | null {
  switch (name) {
    case "property-search":
      return createPropertySearchPipeline(options);
    case "market-research":
      return createMarketResearchPipeline(options);
    case "financial-analysis":
      return createFinancialAnalysisPipeline(options);
    case "quick-lookup":
      return createQuickLookupPipeline(options);
    case "graph-analysis":
      return createGraphAnalysisPipeline(options);
    case "parallel-search":
      return createParallelSearchPipeline(options);
    default:
      return null;
  }
}

/**
 * List all available pipeline templates
 */
export function listPipelineTemplates(): Array<{
  name: string;
  description: string;
  stages: string[];
}> {
  return [
    {
      name: "property-search",
      description: "Basic property search pipeline",
      stages: [
        "parse-goal",
        "property-search",
        "dedupe-rank",
        "compliance-check",
        "generate-report",
      ],
    },
    {
      name: "market-research",
      description: "Comprehensive market research pipeline",
      stages: [
        "parse-goal",
        "property-search",
        "analytics-summary",
        "group-by-zip",
        "dedupe-rank",
        "graph-analysis",
        "map-link",
        "compliance-check",
        "generate-report",
      ],
    },
    {
      name: "financial-analysis",
      description:
        "Financial analysis pipeline with mortgage and affordability",
      stages: [
        "parse-goal",
        "property-search",
        "mortgage-calculation",
        "affordability-calculation",
        "analytics-summary",
        "dedupe-rank",
        "compliance-check",
        "generate-report",
      ],
    },
    {
      name: "quick-lookup",
      description: "Quick property lookup by ZPID",
      stages: ["parse-goal", "map-link", "generate-report"],
    },
    {
      name: "graph-analysis",
      description: "Property relationship and similarity analysis",
      stages: [
        "parse-goal",
        "property-search",
        "dedupe-rank",
        "graph-analysis",
        "map-link",
        "compliance-check",
        "generate-report",
      ],
    },
    {
      name: "parallel-search",
      description: "Parallel property search with multiple criteria",
      stages: [
        "parse-goal",
        "property-search",
        "dedupe-rank",
        "analytics-summary",
        "compliance-check",
        "generate-report",
      ],
    },
  ];
}
