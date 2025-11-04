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

// State Persistence
export {
  CheckpointManager,
  SnapshotManager,
  FileStateStorage,
  MemoryStateStorage,
  RedisStateStorage,
  createCheckpointMiddleware,
  createSnapshotMiddleware,
  resumeFromCheckpoint,
  type Checkpoint,
  type StateSnapshot,
  type StateStorage,
} from "./persistence.js";

// Distributed Execution
export {
  PipelineWorker,
  WorkerPool,
  LoadBalancer,
  DistributedPipelineExecutor,
  InMemoryQueue,
  PriorityQueue,
  createDistributedMiddleware,
  type WorkItem,
  type WorkerStatus,
  type MessageQueue,
} from "./distributed.js";

// Scheduling
export {
  PipelineScheduler,
  DelayedExecutor,
  RecurringExecutor,
  DependencyGraph,
  CronParser,
  type ScheduleConfig,
  type ScheduledExecution,
  type CronExpression,
} from "./scheduler.js";

// Testing
export {
  MockStage,
  SpyStage,
  Assertions,
  TestRunner,
  TestHelpers,
  type TestCase,
  type TestSuite,
  type TestResult,
  type SuiteResult,
} from "./testing.js";

// Optimization
export {
  PipelineOptimizer,
  ResourceTracker,
  PerformanceBudget,
  type PerformanceProfile,
  type BottleneckAnalysis,
  type OptimizationRecommendation,
} from "./optimization.js";

// Plugins
export {
  PluginRegistry,
  GenericExtensionPoint,
  PluginAwarePipelineBuilder,
  NotificationPlugin,
  MetricsAggregationPlugin,
  WebhookPlugin,
  PluginLoader,
  type Plugin,
  type PluginMetadata,
  type PluginHooks,
  type ExtensionPoint,
} from "./plugins.js";

// Visualization
export {
  PipelineDAGBuilder,
  TimelineVisualizer,
  DashboardGenerator,
  FlowDiagramGenerator,
  type DAGGraph,
  type DAGNode,
  type DAGEdge,
  type DashboardData,
} from "./visualization.js";

// Advanced Caching
export {
  L1Cache,
  L2Cache,
  L3Cache,
  MultiLevelCache,
  CacheWarmer,
  type Cache,
  type CacheEntry as AdvancedCacheEntry,
  type CacheStats,
} from "./caching.js";

// Workflows
export {
  ApprovalManager,
  ApprovalGateStage,
  UserInputManager,
  UserInputStage,
  ConsoleNotificationService,
  EmailNotificationService,
  createApprovalMiddleware,
  createUserInputMiddleware,
  type ApprovalRequest,
  type ApprovalResponse,
  type ApprovalGateConfig,
  type UserInputConfig,
  type NotificationService,
} from "./workflows.js";

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

  // State Persistence
  persistence: {
    CheckpointManager,
    SnapshotManager,
    FileStorage: FileStateStorage,
    MemoryStorage: MemoryStateStorage,
    RedisStorage: RedisStateStorage,
    createCheckpointMiddleware,
    createSnapshotMiddleware,
    resumeFromCheckpoint,
  },

  // Distributed Execution
  distributed: {
    Worker: PipelineWorker,
    WorkerPool,
    LoadBalancer,
    Executor: DistributedPipelineExecutor,
    InMemoryQueue,
    PriorityQueue,
    createMiddleware: createDistributedMiddleware,
  },

  // Scheduling
  scheduling: {
    Scheduler: PipelineScheduler,
    DelayedExecutor,
    RecurringExecutor,
    DependencyGraph,
    CronParser,
  },

  // Testing
  testing: {
    MockStage,
    SpyStage,
    Assertions,
    TestRunner,
    helpers: TestHelpers,
  },

  // Optimization
  optimization: {
    Optimizer: PipelineOptimizer,
    ResourceTracker,
    PerformanceBudget,
  },

  // Plugins
  plugins: {
    Registry: PluginRegistry,
    ExtensionPoint: GenericExtensionPoint,
    Builder: PluginAwarePipelineBuilder,
    Loader: PluginLoader,
    builtIn: {
      Notification: NotificationPlugin,
      MetricsAggregation: MetricsAggregationPlugin,
      Webhook: WebhookPlugin,
    },
  },

  // Visualization
  visualization: {
    DAGBuilder: PipelineDAGBuilder,
    Timeline: TimelineVisualizer,
    Dashboard: DashboardGenerator,
    FlowDiagram: FlowDiagramGenerator,
  },

  // Advanced Caching
  caching: {
    L1Cache,
    L2Cache,
    L3Cache,
    MultiLevel: MultiLevelCache,
    Warmer: CacheWarmer,
  },

  // Workflows
  workflows: {
    ApprovalManager,
    ApprovalGate: ApprovalGateStage,
    UserInputManager,
    UserInput: UserInputStage,
    notifications: {
      Console: ConsoleNotificationService,
      Email: EmailNotificationService,
    },
    createApprovalMiddleware,
    createUserInputMiddleware,
  },
};
