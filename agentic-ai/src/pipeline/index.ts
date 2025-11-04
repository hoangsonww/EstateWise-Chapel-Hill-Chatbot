/**
 * Pipeline System - Main Entry Point
 *
 * Enhanced assembly line pipeline architecture for EstateWise agentic AI.
 */

// Core types
export type {
  PipelineContext,
  PipelineStage,
  PipelineMiddleware,
  PipelineResult,
  PipelineOptions,
  PipelineEvent,
  PipelineMetrics,
  StageResult,
  BranchCondition,
  ErrorRecoveryStrategy,
  ValidationResult,
  Pipeline,
  CacheEntry,
  ExecutionStrategy,
} from "./types.js";

// Core classes
export { Stage, createStage, createTransformStage, createConditionalStage, createParallelStage } from "./Stage.js";
export { Pipeline } from "./Pipeline.js";
export { PipelineBuilder, createPipeline, createPipelineFromFunction } from "./PipelineBuilder.js";

// Middleware
export {
  createLoggingMiddleware,
  createMetricsMiddleware,
  createPerformanceMiddleware,
  createErrorRecoveryMiddleware,
  createValidationMiddleware,
  createRateLimitMiddleware,
  createAuditMiddleware,
  createTimeoutMiddleware,
  createCircuitBreakerMiddleware,
  createTracingMiddleware,
  createContextEnrichmentMiddleware,
} from "./middleware.js";

// Agent stages
export {
  createAgentStage,
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

// Templates
export {
  createPropertySearchPipeline,
  createMarketResearchPipeline,
  createFinancialAnalysisPipeline,
  createQuickLookupPipeline,
  createGraphAnalysisPipeline,
  createParallelSearchPipeline,
  getPipelineTemplate,
  listPipelineTemplates,
  type TemplateOptions,
} from "./templates.js";

// Advanced features
export {
  composePipelines,
  createParallelStage as createAdvancedParallelStage,
  createBranchStage,
  createErrorRecoveryStage,
  createRetryStrategy,
  createFallbackStrategy,
  createDynamicPipeline,
  createLoopStage,
  createMapStage,
  createFilterStage,
  createReduceStage,
} from "./advanced.js";

// Monitoring
export {
  PipelineMonitor,
  PipelineEventStream,
  PipelineHealthChecker,
  createMonitoringMiddleware,
  type ExecutionTrace,
} from "./monitoring.js";

// Convenience exports for common workflows
export const PipelineSystem = {
  // Create pipelines
  create: createPipeline,
  fromFunction: createPipelineFromFunction,
  fromTemplate: getPipelineTemplate,
  compose: composePipelines,

  // Create stages
  stage: createStage,
  transformStage: createTransformStage,
  conditionalStage: createConditionalStage,
  parallelStage: createParallelStage,
  branchStage: createBranchStage,
  loopStage: createLoopStage,
  mapStage: createMapStage,
  filterStage: createFilterStage,
  reduceStage: createReduceStage,

  // Middleware
  middleware: {
    logging: createLoggingMiddleware,
    metrics: createMetricsMiddleware,
    performance: createPerformanceMiddleware,
    errorRecovery: createErrorRecoveryMiddleware,
    validation: createValidationMiddleware,
    rateLimit: createRateLimitMiddleware,
    audit: createAuditMiddleware,
    timeout: createTimeoutMiddleware,
    circuitBreaker: createCircuitBreakerMiddleware,
    tracing: createTracingMiddleware,
    contextEnrichment: createContextEnrichmentMiddleware,
  },

  // Templates
  templates: {
    propertySearch: createPropertySearchPipeline,
    marketResearch: createMarketResearchPipeline,
    financialAnalysis: createFinancialAnalysisPipeline,
    quickLookup: createQuickLookupPipeline,
    graphAnalysis: createGraphAnalysisPipeline,
    parallelSearch: createParallelSearchPipeline,
    list: listPipelineTemplates,
  },

  // Monitoring
  monitoring: {
    Monitor: PipelineMonitor,
    EventStream: PipelineEventStream,
    HealthChecker: PipelineHealthChecker,
    createMiddleware: createMonitoringMiddleware,
  },

  // Strategies
  strategies: {
    retry: createRetryStrategy,
    fallback: createFallbackStrategy,
  },
};
