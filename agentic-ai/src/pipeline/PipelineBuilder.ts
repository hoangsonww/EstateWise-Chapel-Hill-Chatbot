/**
 * Pipeline Builder
 *
 * Fluent API for constructing pipelines with stages, middleware, and configuration.
 */

import { Pipeline } from "./Pipeline.js";
import { Stage, createStage, createTransformStage } from "./Stage.js";
import type {
  PipelineOptions,
  PipelineStage,
  PipelineMiddleware,
  PipelineContext,
  BranchCondition,
} from "./types.js";

/**
 * Fluent builder for constructing pipelines
 */
export class PipelineBuilder<
  TInput = unknown,
  TOutput = unknown,
  TState = Record<string, unknown>,
> {
  private pipeline: Pipeline<TInput, TOutput, TState>;

  constructor(options: Partial<PipelineOptions> = {}) {
    this.pipeline = new Pipeline<TInput, TOutput, TState>(options);
  }

  /**
   * Set the pipeline name
   */
  withName(name: string): this {
    this.pipeline.options.name = name;
    return this;
  }

  /**
   * Set the pipeline description
   */
  withDescription(description: string): this {
    this.pipeline.options.description = description;
    return this;
  }

  /**
   * Add a stage to the pipeline
   */
  addStage(stage: PipelineStage<unknown, unknown, TState>): this {
    this.pipeline.addStage(stage);
    return this;
  }

  /**
   * Add a simple stage with just a name and execution function
   */
  stage(
    name: string,
    execute: (context: PipelineContext<unknown, TState>) => Promise<unknown>,
    options?: {
      description?: string;
      retryable?: boolean;
      maxRetries?: number;
      timeout?: number;
    },
  ): this {
    const stage = createStage(name, execute, options);
    return this.addStage(stage);
  }

  /**
   * Add a transformation stage that modifies the state
   */
  transform(
    name: string,
    transform: (state: TState) => Promise<Partial<TState>> | Partial<TState>,
    options?: {
      description?: string;
      retryable?: boolean;
      maxRetries?: number;
      timeout?: number;
    },
  ): this {
    const stage = createTransformStage(name, transform, options);
    return this.addStage(stage);
  }

  /**
   * Add a conditional stage that only executes if condition is met
   */
  when(
    condition: (
      context: PipelineContext<unknown, TState>,
    ) => Promise<boolean> | boolean,
    configurePipeline: (
      builder: PipelineBuilder<unknown, unknown, TState>,
    ) => void,
  ): this {
    const conditionalBuilder = new PipelineBuilder<unknown, unknown, TState>();
    configurePipeline(conditionalBuilder);

    const conditionalStage = new Stage({
      name: "conditional",
      execute: async (context) => {
        const shouldExecute = await condition(
          context as PipelineContext<unknown, TState>,
        );
        if (shouldExecute) {
          const conditionalPipeline = conditionalBuilder.build();
          const result = await conditionalPipeline.execute(
            context.input,
            context.signal,
          );
          return result.output;
        }
        return null;
      },
    });

    return this.addStage(
      conditionalStage as PipelineStage<unknown, unknown, TState>,
    );
  }

  /**
   * Add a conditional stage - simpler version that executes a single stage if condition is met
   */
  conditional(
    condition: (
      context: PipelineContext<unknown, TState>,
    ) => Promise<boolean> | boolean,
    stage: PipelineStage<unknown, unknown, TState>,
  ): this {
    const conditionalStage = new Stage({
      name: `conditional-${stage.name}`,
      execute: async (context) => {
        const shouldExecute = await condition(
          context as PipelineContext<unknown, TState>,
        );
        if (shouldExecute) {
          const result = await stage.execute(
            context as PipelineContext<unknown, TState>,
          );
          return result.output;
        }
        return null;
      },
    });

    return this.addStage(
      conditionalStage as PipelineStage<unknown, unknown, TState>,
    );
  }

  /**
   * Add a branch - execute different stages based on conditions
   */
  branch(branches: BranchCondition<TState>[]): this {
    const branchStage = new Stage({
      name: "branch",
      execute: async (context) => {
        for (const branch of branches) {
          const shouldTake = await branch.condition(
            context as PipelineContext<unknown, TState>,
          );
          if (shouldTake) {
            // Execute branch stages
            for (const stage of branch.stages) {
              const result = await stage.execute(context as any);
              if (!result.success || !result.continue) {
                return result.output;
              }
            }
            return null;
          }
        }
        return null;
      },
    });

    return this.addStage(
      branchStage as PipelineStage<unknown, unknown, TState>,
    );
  }

  /**
   * Add a parallel execution stage
   */
  parallel(
    name: string,
    stages: PipelineStage<unknown, unknown, TState>[],
    options?: {
      description?: string;
      maxConcurrency?: number;
    },
  ): this {
    const parallelStage = new Stage({
      name,
      description: options?.description,
      execute: async (context) => {
        const maxConcurrency = options?.maxConcurrency ?? stages.length;
        const results = [];

        // Execute in batches if maxConcurrency is specified
        for (let i = 0; i < stages.length; i += maxConcurrency) {
          const batch = stages.slice(i, i + maxConcurrency);
          const batchResults = await Promise.all(
            batch.map((stage) =>
              stage.execute(context as PipelineContext<unknown, TState>),
            ),
          );
          results.push(...batchResults);
        }

        return results;
      },
    });

    return this.addStage(
      parallelStage as PipelineStage<unknown, unknown, TState>,
    );
  }

  /**
   * Add middleware to the pipeline
   */
  use(middleware: PipelineMiddleware<TState>): this {
    this.pipeline.addMiddleware(middleware);
    return this;
  }

  /**
   * Add logging middleware
   */
  withLogging(options?: {
    logLevel?: "debug" | "info" | "warn" | "error";
    logger?: Console;
  }): this {
    const logger = options?.logger ?? console;
    const logLevel = options?.logLevel ?? "info";

    const loggingMiddleware: PipelineMiddleware<TState> = {
      name: "logging",
      onPipelineStart: async (context) => {
        if (logLevel === "debug" || logLevel === "info") {
          logger.log(`[Pipeline] Starting execution ${context.executionId}`);
        }
      },
      onPipelineComplete: async (context, result) => {
        if (logLevel === "debug" || logLevel === "info") {
          logger.log(
            `[Pipeline] Completed execution ${context.executionId} - Success: ${result.success}, Duration: ${result.metrics.totalDuration}ms`,
          );
        }
      },
      onStageStart: async (context, stage) => {
        if (logLevel === "debug") {
          logger.log(`[Stage] Starting ${stage.name}`);
        }
      },
      onStageComplete: async (context, stage, result) => {
        if (logLevel === "debug") {
          logger.log(
            `[Stage] Completed ${stage.name} - Success: ${result.success}, Duration: ${result.metadata?.duration}ms`,
          );
        }
      },
      onError: async (context, error, stage) => {
        if (logLevel === "error" || logLevel === "warn") {
          logger.error(
            `[Error] ${stage ? `Stage ${stage.name}` : "Pipeline"}: ${error.message}`,
          );
        }
      },
    };

    return this.use(loggingMiddleware);
  }

  /**
   * Add metrics collection middleware
   */
  withMetrics(options?: { onMetrics?: (metrics: any) => void }): this {
    const metricsMiddleware: PipelineMiddleware<TState> = {
      name: "metrics",
      onPipelineComplete: async (context, result) => {
        if (options?.onMetrics) {
          options.onMetrics({
            executionId: context.executionId,
            success: result.success,
            duration: result.metrics.totalDuration,
            stages: result.metrics.stageCount,
            toolCalls: result.metrics.toolCallsTotal,
          });
        }
      },
    };

    return this.use(metricsMiddleware);
  }

  /**
   * Add caching middleware
   */
  withCaching(options?: { ttl?: number }): this {
    // Caching is built into the Pipeline class
    // This method just updates the options
    this.pipeline.options.enableCaching = true;
    if (options?.ttl) {
      this.pipeline.options.cacheTTL = options.ttl;
    }
    return this;
  }

  /**
   * Add validation middleware
   */
  withValidation(options?: {
    validateInput?: (input: unknown) => Promise<boolean> | boolean;
    validateOutput?: (output: unknown) => Promise<boolean> | boolean;
  }): this {
    const validationMiddleware: PipelineMiddleware<TState> = {
      name: "validation",
      onPipelineStart: async (context) => {
        if (options?.validateInput) {
          const isValid = await options.validateInput(context.input);
          if (!isValid) {
            throw new Error("Input validation failed");
          }
        }
      },
      onPipelineComplete: async (context, result) => {
        if (options?.validateOutput && result.success) {
          const isValid = await options.validateOutput(result.output);
          if (!isValid) {
            throw new Error("Output validation failed");
          }
        }
      },
    };

    return this.use(validationMiddleware);
  }

  /**
   * Add error recovery middleware
   */
  withErrorRecovery(options: {
    onError: (error: Error, context: PipelineContext) => Promise<void>;
    maxRetries?: number;
  }): this {
    let retries = 0;

    const errorRecoveryMiddleware: PipelineMiddleware<TState> = {
      name: "error-recovery",
      onError: async (context, error, stage) => {
        if (retries < (options.maxRetries ?? 3)) {
          retries++;
          await options.onError(error, context as any);
        }
      },
    };

    return this.use(errorRecoveryMiddleware);
  }

  /**
   * Add rate limiting middleware
   */
  withRateLimit(options: {
    maxRequestsPerWindow: number;
    windowMs: number;
  }): this {
    const requests: number[] = [];

    const rateLimitMiddleware: PipelineMiddleware<TState> = {
      name: "rate-limit",
      onPipelineStart: async (context) => {
        const now = Date.now();
        const windowStart = now - options.windowMs;

        // Remove old requests
        while (requests.length > 0 && requests[0] < windowStart) {
          requests.shift();
        }

        // Check limit
        if (requests.length >= options.maxRequestsPerWindow) {
          throw new Error("Rate limit exceeded");
        }

        requests.push(now);
      },
    };

    return this.use(rateLimitMiddleware);
  }

  /**
   * Add audit logging middleware
   */
  withAudit(options: {
    onAudit: (event: {
      type: string;
      timestamp: number;
      executionId: string;
      data: unknown;
    }) => Promise<void> | void;
  }): this {
    const auditMiddleware: PipelineMiddleware<TState> = {
      name: "audit",
      onPipelineStart: async (context) => {
        await options.onAudit({
          type: "pipeline-start",
          timestamp: Date.now(),
          executionId: context.executionId,
          data: { input: context.input },
        });
      },
      onPipelineComplete: async (context, result) => {
        await options.onAudit({
          type: "pipeline-complete",
          timestamp: Date.now(),
          executionId: context.executionId,
          data: {
            success: result.success,
            output: result.output,
            metrics: result.metrics,
          },
        });
      },
    };

    return this.use(auditMiddleware);
  }

  /**
   * Build and return the pipeline
   */
  build(): Pipeline<TInput, TOutput, TState> {
    return this.pipeline;
  }

  /**
   * Build and execute the pipeline immediately
   */
  async run(input: TInput, signal?: AbortSignal) {
    return this.pipeline.execute(input, signal);
  }

  /**
   * Build and execute with streaming
   */
  async runStream(
    input: TInput,
    onEvent: (event: any) => void,
    signal?: AbortSignal,
  ) {
    return this.pipeline.executeStream(input, onEvent, signal);
  }
}

/**
 * Create a new pipeline builder
 */
export function createPipeline<
  TInput = unknown,
  TOutput = unknown,
  TState = Record<string, unknown>,
>(
  options: Partial<PipelineOptions> = {},
): PipelineBuilder<TInput, TOutput, TState> {
  return new PipelineBuilder<TInput, TOutput, TState>(options);
}

/**
 * Create a pipeline from a function
 */
export function createPipelineFromFunction<TInput, TOutput>(
  name: string,
  fn: (input: TInput) => Promise<TOutput>,
): Pipeline<TInput, TOutput> {
  return createPipeline<TInput, TOutput>({ name })
    .stage("execute", async (context) => {
      return fn(context.input as TInput);
    })
    .build();
}
