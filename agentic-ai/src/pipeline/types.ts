/**
 * Assembly Line Pipeline Types
 *
 * Core type definitions for the enhanced pipeline system with assembly line design pattern.
 */

import type { AgentMessage, Blackboard, Role, ToolCall } from "../core/types.js";

/**
 * Pipeline execution context - carries data through all stages
 */
export interface PipelineContext<TInput = unknown, TState = Record<string, unknown>> {
  /** Unique execution ID for this pipeline run */
  executionId: string;

  /** Original input to the pipeline */
  input: TInput;

  /** Current state accumulated through stages */
  state: TState;

  /** Shared blackboard for agent coordination */
  blackboard: Blackboard;

  /** Agent messages history */
  messages: AgentMessage[];

  /** Metadata for this execution */
  metadata: {
    startTime: number;
    currentStage?: string;
    completedStages: string[];
    failedStages: string[];
    [key: string]: unknown;
  };

  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Result of a pipeline stage execution
 */
export interface StageResult<TOutput = unknown> {
  /** Whether the stage succeeded */
  success: boolean;

  /** Output data from the stage */
  output?: TOutput;

  /** Error if stage failed */
  error?: Error;

  /** Should execution continue to next stage? */
  continue: boolean;

  /** Optional branch to take (for conditional pipelines) */
  branch?: string;

  /** Metadata about this stage execution */
  metadata?: {
    duration: number;
    toolCalls?: ToolCall[];
    tokensUsed?: number;
    attempts?: number;
    [key: string]: unknown;
  };
}

/**
 * A single stage in the pipeline assembly line
 */
export interface PipelineStage<TInput = unknown, TOutput = unknown, TState = Record<string, unknown>> {
  /** Unique stage identifier */
  name: string;

  /** Stage description */
  description?: string;

  /** Execute the stage */
  execute(
    context: PipelineContext<TInput, TState>
  ): Promise<StageResult<TOutput>>;

  /** Optional validation before execution */
  validate?(context: PipelineContext<TInput, TState>): Promise<boolean>;

  /** Optional cleanup after execution */
  cleanup?(context: PipelineContext<TInput, TState>): Promise<void>;

  /** Whether this stage can be retried on failure */
  retryable?: boolean;

  /** Maximum retry attempts */
  maxRetries?: number;

  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Pipeline middleware - intercepts execution at various points
 */
export interface PipelineMiddleware<TState = Record<string, unknown>> {
  /** Unique middleware identifier */
  name: string;

  /** Called before pipeline starts */
  onPipelineStart?(context: PipelineContext<unknown, TState>): Promise<void>;

  /** Called after pipeline completes */
  onPipelineComplete?(
    context: PipelineContext<unknown, TState>,
    result: PipelineResult<unknown, TState>
  ): Promise<void>;

  /** Called before each stage */
  onStageStart?(
    context: PipelineContext<unknown, TState>,
    stage: PipelineStage<unknown, unknown, TState>
  ): Promise<void>;

  /** Called after each stage */
  onStageComplete?(
    context: PipelineContext<unknown, TState>,
    stage: PipelineStage<unknown, unknown, TState>,
    result: StageResult
  ): Promise<void>;

  /** Called on any error */
  onError?(
    context: PipelineContext<unknown, TState>,
    error: Error,
    stage?: PipelineStage<unknown, unknown, TState>
  ): Promise<void>;
}

/**
 * Final result of pipeline execution
 */
export interface PipelineResult<TOutput = unknown, TState = Record<string, unknown>> {
  /** Whether the pipeline succeeded */
  success: boolean;

  /** Final output */
  output?: TOutput;

  /** Error if pipeline failed */
  error?: Error;

  /** Execution context */
  context: PipelineContext<unknown, TState>;

  /** Results from each stage */
  stageResults: Map<string, StageResult>;

  /** Execution metrics */
  metrics: {
    totalDuration: number;
    stageCount: number;
    successfulStages: number;
    failedStages: number;
    retriedStages: number;
    toolCallsTotal: number;
    tokensUsedTotal?: number;
  };
}

/**
 * Pipeline configuration options
 */
export interface PipelineOptions {
  /** Pipeline name */
  name: string;

  /** Pipeline description */
  description?: string;

  /** Default timeout for stages (ms) */
  defaultTimeout?: number;

  /** Whether to continue on stage failures */
  continueOnError?: boolean;

  /** Maximum concurrent stages (for parallel execution) */
  maxConcurrency?: number;

  /** Enable pipeline caching */
  enableCaching?: boolean;

  /** Cache TTL in milliseconds */
  cacheTTL?: number;

  /** Enable streaming events */
  enableStreaming?: boolean;

  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Pipeline event for streaming
 */
export interface PipelineEvent {
  type: 'pipeline-start' | 'pipeline-complete' | 'stage-start' | 'stage-complete' | 'stage-error' | 'middleware-event';
  timestamp: number;
  executionId: string;
  stageName?: string;
  data?: unknown;
  error?: Error;
}

/**
 * Pipeline branch condition
 */
export interface BranchCondition<TState = Record<string, unknown>> {
  /** Branch name */
  name: string;

  /** Condition to evaluate */
  condition(context: PipelineContext<unknown, TState>): Promise<boolean> | boolean;

  /** Stages to execute if condition is true */
  stages: PipelineStage[];
}

/**
 * Pipeline template configuration
 */
export interface PipelineTemplate {
  name: string;
  description: string;
  stages: Array<{
    stageName: string;
    config?: Record<string, unknown>;
  }>;
  middleware?: string[];
  options?: Partial<PipelineOptions>;
}

/**
 * Cache entry for pipeline results
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

/**
 * Pipeline metrics snapshot
 */
export interface PipelineMetrics {
  pipelineName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  stageMetrics: Map<string, {
    executions: number;
    successes: number;
    failures: number;
    averageDuration: number;
    retries: number;
  }>;
  lastExecutionTime?: number;
}

/**
 * Pipeline execution strategy
 */
export type ExecutionStrategy = 'sequential' | 'parallel' | 'conditional' | 'dynamic';

/**
 * Error recovery strategy
 */
export interface ErrorRecoveryStrategy {
  /** Strategy name */
  name: string;

  /** Determine if error is recoverable */
  isRecoverable(error: Error, context: PipelineContext): boolean;

  /** Attempt to recover from error */
  recover(error: Error, context: PipelineContext, stage: PipelineStage): Promise<StageResult>;

  /** Maximum recovery attempts */
  maxAttempts?: number;
}

/**
 * Pipeline validator
 */
export interface PipelineValidator {
  /** Validator name */
  name: string;

  /** Validate pipeline configuration */
  validate(pipeline: Pipeline<unknown, unknown>): Promise<ValidationResult>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Pipeline interface
 */
export interface Pipeline<TInput = unknown, TOutput = unknown, TState = Record<string, unknown>> {
  /** Pipeline options */
  options: PipelineOptions;

  /** Registered stages */
  stages: PipelineStage<unknown, unknown, TState>[];

  /** Registered middleware */
  middleware: PipelineMiddleware<TState>[];

  /** Execute the pipeline */
  execute(input: TInput, signal?: AbortSignal): Promise<PipelineResult<TOutput, TState>>;

  /** Execute with streaming events */
  executeStream(
    input: TInput,
    onEvent: (event: PipelineEvent) => void,
    signal?: AbortSignal
  ): Promise<PipelineResult<TOutput, TState>>;

  /** Add a stage to the pipeline */
  addStage(stage: PipelineStage<unknown, unknown, TState>): Pipeline<TInput, TOutput, TState>;

  /** Add middleware to the pipeline */
  addMiddleware(middleware: PipelineMiddleware<TState>): Pipeline<TInput, TOutput, TState>;

  /** Validate the pipeline */
  validate(): Promise<ValidationResult>;

  /** Get pipeline metrics */
  getMetrics(): PipelineMetrics;

  /** Clear pipeline cache */
  clearCache(): void;
}
