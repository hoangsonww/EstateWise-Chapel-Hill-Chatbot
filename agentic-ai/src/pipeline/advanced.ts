/**
 * Advanced Pipeline Features
 *
 * Advanced capabilities including pipeline composition, parallel execution,
 * conditional branching, error recovery, and dynamic pipeline construction.
 */

import { Pipeline } from "./Pipeline.js";
import { Stage, createStage } from "./Stage.js";
import { createPipeline } from "./PipelineBuilder.js";
import type {
  PipelineStage,
  PipelineContext,
  StageResult,
  PipelineResult,
  BranchCondition,
  ErrorRecoveryStrategy,
} from "./types.js";

/**
 * Compose multiple pipelines into a single pipeline
 */
export function composePipelines<TInput = unknown, TOutput = unknown>(
  pipelines: Pipeline<unknown, unknown>[],
  options?: {
    name?: string;
    description?: string;
  }
): Pipeline<TInput, TOutput> {
  const builder = createPipeline<TInput, TOutput>({
    name: options?.name || 'composed-pipeline',
    description: options?.description || 'Composed pipeline from multiple pipelines',
  });

  // Create a stage for each pipeline
  for (let i = 0; i < pipelines.length; i++) {
    const pipeline = pipelines[i];
    builder.stage(
      `pipeline-${i}-${pipeline.options.name}`,
      async (context) => {
        const result = await pipeline.execute(
          i === 0 ? context.input : context.state,
          context.signal
        );
        if (!result.success) {
          throw result.error || new Error(`Pipeline ${pipeline.options.name} failed`);
        }
        return result.output;
      },
      {
        description: `Execute ${pipeline.options.name}`,
        timeout: pipeline.options.defaultTimeout,
      }
    );
  }

  return builder.build();
}

/**
 * Create a parallel execution stage that runs multiple stages concurrently
 */
export function createParallelStage<TState = Record<string, unknown>>(
  name: string,
  stages: PipelineStage<unknown, unknown, TState>[],
  options?: {
    description?: string;
    maxConcurrency?: number;
    continueOnError?: boolean;
    timeout?: number;
  }
): Stage<unknown, Array<StageResult>, TState> {
  return new Stage({
    name,
    description: options?.description || `Parallel execution of ${stages.length} stages`,
    execute: async (context: PipelineContext<unknown, TState>) => {
      const maxConcurrency = options?.maxConcurrency ?? stages.length;
      const results: StageResult[] = [];
      const errors: Error[] = [];

      // Execute stages in batches based on maxConcurrency
      for (let i = 0; i < stages.length; i += maxConcurrency) {
        const batch = stages.slice(i, i + maxConcurrency);

        const batchResults = await Promise.allSettled(
          batch.map((stage) => stage.execute(context))
        );

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            const error = result.reason instanceof Error
              ? result.reason
              : new Error(String(result.reason));
            errors.push(error);
            results.push({
              success: false,
              error,
              continue: options?.continueOnError ?? false,
            });
          }
        }
      }

      // If any stage failed and continueOnError is false, throw
      if (errors.length > 0 && !options?.continueOnError) {
        throw new Error(
          `Parallel execution failed: ${errors.map((e) => e.message).join(', ')}`
        );
      }

      return results;
    },
    timeout: options?.timeout,
    retryable: false,
  });
}

/**
 * Create a conditional branch stage
 */
export function createBranchStage<TState = Record<string, unknown>>(
  name: string,
  branches: BranchCondition<TState>[],
  defaultBranch?: PipelineStage<unknown, unknown, TState>[],
  options?: {
    description?: string;
    timeout?: number;
  }
): Stage<unknown, unknown, TState> {
  return new Stage({
    name,
    description: options?.description || `Conditional branch with ${branches.length} conditions`,
    execute: async (context: PipelineContext<unknown, TState>) => {
      // Evaluate branches in order
      for (const branch of branches) {
        const shouldTake = await branch.condition(context);

        if (shouldTake) {
          // Execute this branch's stages
          let lastOutput: unknown;
          for (const stage of branch.stages) {
            const result = await stage.execute(context);
            if (!result.success) {
              throw result.error || new Error(`Branch stage ${stage.name} failed`);
            }
            if (!result.continue) {
              return result.output;
            }
            lastOutput = result.output;
          }
          return lastOutput;
        }
      }

      // No branch matched - execute default if provided
      if (defaultBranch) {
        let lastOutput: unknown;
        for (const stage of defaultBranch) {
          const result = await stage.execute(context);
          if (!result.success) {
            throw result.error || new Error(`Default branch stage ${stage.name} failed`);
          }
          if (!result.continue) {
            return result.output;
          }
          lastOutput = result.output;
        }
        return lastOutput;
      }

      return null;
    },
    timeout: options?.timeout,
    retryable: false,
  });
}

/**
 * Create an error recovery stage that wraps another stage with recovery logic
 */
export function createErrorRecoveryStage<TInput = unknown, TOutput = unknown, TState = Record<string, unknown>>(
  stage: PipelineStage<TInput, TOutput, TState>,
  strategy: ErrorRecoveryStrategy,
  options?: {
    description?: string;
    timeout?: number;
  }
): Stage<TInput, TOutput, TState> {
  return new Stage({
    name: `${stage.name}-with-recovery`,
    description: options?.description || `${stage.name} with error recovery`,
    execute: async (context: PipelineContext<TInput, TState>) => {
      const maxAttempts = strategy.maxAttempts ?? 3;
      let attempts = 0;

      while (attempts < maxAttempts) {
        try {
          const result = await stage.execute(context);
          if (result.success) {
            return result.output as TOutput;
          }

          // Stage failed - check if recoverable
          if (result.error && strategy.isRecoverable(result.error, context)) {
            // Attempt recovery
            const recoveryResult = await strategy.recover(result.error, context, stage);
            if (recoveryResult.success && recoveryResult.output !== undefined) {
              return recoveryResult.output as TOutput;
            }
          }

          // Not recoverable or recovery failed
          throw result.error || new Error(`Stage ${stage.name} failed`);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          attempts++;

          if (strategy.isRecoverable(err, context) && attempts < maxAttempts) {
            const recoveryResult = await strategy.recover(err, context, stage);
            if (recoveryResult.success && recoveryResult.output !== undefined) {
              return recoveryResult.output as TOutput;
            }
          } else {
            throw err;
          }
        }
      }

      throw new Error(`Stage ${stage.name} exhausted all recovery attempts`);
    },
    timeout: options?.timeout,
    retryable: false,
  });
}

/**
 * Create a retry strategy with exponential backoff
 */
export function createRetryStrategy(options?: {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}): ErrorRecoveryStrategy {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 30000;

  return {
    name: 'retry-strategy',
    maxAttempts,
    isRecoverable: (error) => {
      if (options?.shouldRetry) {
        return options.shouldRetry(error);
      }
      // Default: retry on network/timeout errors
      return error.message.includes('timeout') ||
             error.message.includes('network') ||
             error.message.includes('ECONNREFUSED');
    },
    recover: async (error, context, stage) => {
      // Calculate delay with exponential backoff
      const attempt = (context.metadata as any).retryAttempt ?? 0;
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Update metadata
      (context.metadata as any).retryAttempt = attempt + 1;

      // Retry the stage
      return stage.execute(context);
    },
  };
}

/**
 * Create a fallback strategy that uses alternative logic on failure
 */
export function createFallbackStrategy<TState = Record<string, unknown>>(
  fallbackStage: PipelineStage<unknown, unknown, TState>
): ErrorRecoveryStrategy {
  return {
    name: 'fallback-strategy',
    maxAttempts: 1,
    isRecoverable: () => true,
    recover: async (error, context) => {
      // Execute fallback stage
      return fallbackStage.execute(context);
    },
  };
}

/**
 * Create a dynamic pipeline that constructs stages at runtime
 */
export function createDynamicPipeline<TInput = unknown, TOutput = unknown, TState = Record<string, unknown>>(
  name: string,
  stageFactory: (
    input: TInput,
    context: PipelineContext<TInput, TState>
  ) => Promise<PipelineStage<unknown, unknown, TState>[]>,
  options?: {
    description?: string;
    timeout?: number;
  }
): Pipeline<TInput, TOutput, TState> {
  const builder = createPipeline<TInput, TOutput, TState>({
    name,
    description: options?.description || 'Dynamic pipeline',
    defaultTimeout: options?.timeout,
  });

  builder.stage(
    'dynamic-execution',
    async (context) => {
      // Generate stages dynamically
      const stages = await stageFactory(context.input as TInput, context);

      // Execute stages sequentially
      let lastOutput: unknown;
      for (const stage of stages) {
        const result = await stage.execute(context);
        if (!result.success) {
          throw result.error || new Error(`Stage ${stage.name} failed`);
        }
        if (!result.continue) {
          return result.output;
        }
        lastOutput = result.output;
      }

      return lastOutput;
    },
    {
      description: 'Execute dynamically generated stages',
      timeout: options?.timeout,
    }
  );

  return builder.build();
}

/**
 * Create a loop stage that repeats until a condition is met
 */
export function createLoopStage<TState = Record<string, unknown>>(
  name: string,
  stage: PipelineStage<unknown, unknown, TState>,
  condition: (context: PipelineContext<unknown, TState>, iteration: number) => Promise<boolean> | boolean,
  options?: {
    description?: string;
    maxIterations?: number;
    timeout?: number;
  }
): Stage<unknown, unknown[], TState> {
  return new Stage({
    name,
    description: options?.description || `Loop ${stage.name}`,
    execute: async (context: PipelineContext<unknown, TState>) => {
      const maxIterations = options?.maxIterations ?? 10;
      const results: unknown[] = [];
      let iteration = 0;

      while (iteration < maxIterations) {
        // Check condition
        const shouldContinue = await condition(context, iteration);
        if (!shouldContinue) {
          break;
        }

        // Execute stage
        const result = await stage.execute(context);
        results.push(result.output);

        if (!result.success || !result.continue) {
          break;
        }

        iteration++;
      }

      return results;
    },
    timeout: options?.timeout,
    retryable: false,
  });
}

/**
 * Create a map stage that applies a function to each item in a collection
 */
export function createMapStage<TItem, TResult, TState = Record<string, unknown>>(
  name: string,
  getItems: (context: PipelineContext<unknown, TState>) => TItem[] | Promise<TItem[]>,
  mapper: (item: TItem, index: number, context: PipelineContext<unknown, TState>) => Promise<TResult>,
  options?: {
    description?: string;
    maxConcurrency?: number;
    timeout?: number;
  }
): Stage<unknown, TResult[], TState> {
  return new Stage({
    name,
    description: options?.description || `Map operation`,
    execute: async (context: PipelineContext<unknown, TState>) => {
      const items = await getItems(context);
      const maxConcurrency = options?.maxConcurrency ?? items.length;
      const results: TResult[] = [];

      // Process in batches
      for (let i = 0; i < items.length; i += maxConcurrency) {
        const batch = items.slice(i, i + maxConcurrency);
        const batchResults = await Promise.all(
          batch.map((item, idx) => mapper(item, i + idx, context))
        );
        results.push(...batchResults);
      }

      return results;
    },
    timeout: options?.timeout,
    retryable: false,
  });
}

/**
 * Create a filter stage that filters items based on a predicate
 */
export function createFilterStage<TItem, TState = Record<string, unknown>>(
  name: string,
  getItems: (context: PipelineContext<unknown, TState>) => TItem[] | Promise<TItem[]>,
  predicate: (item: TItem, index: number, context: PipelineContext<unknown, TState>) => Promise<boolean> | boolean,
  options?: {
    description?: string;
    timeout?: number;
  }
): Stage<unknown, TItem[], TState> {
  return new Stage({
    name,
    description: options?.description || `Filter operation`,
    execute: async (context: PipelineContext<unknown, TState>) => {
      const items = await getItems(context);
      const results: TItem[] = [];

      for (let i = 0; i < items.length; i++) {
        const shouldInclude = await predicate(items[i], i, context);
        if (shouldInclude) {
          results.push(items[i]);
        }
      }

      return results;
    },
    timeout: options?.timeout,
    retryable: false,
  });
}

/**
 * Create a reduce stage that reduces a collection to a single value
 */
export function createReduceStage<TItem, TResult, TState = Record<string, unknown>>(
  name: string,
  getItems: (context: PipelineContext<unknown, TState>) => TItem[] | Promise<TItem[]>,
  reducer: (
    accumulator: TResult,
    item: TItem,
    index: number,
    context: PipelineContext<unknown, TState>
  ) => Promise<TResult> | TResult,
  initialValue: TResult,
  options?: {
    description?: string;
    timeout?: number;
  }
): Stage<unknown, TResult, TState> {
  return new Stage({
    name,
    description: options?.description || `Reduce operation`,
    execute: async (context: PipelineContext<unknown, TState>) => {
      const items = await getItems(context);
      let accumulator = initialValue;

      for (let i = 0; i < items.length; i++) {
        accumulator = await reducer(accumulator, items[i], i, context);
      }

      return accumulator;
    },
    timeout: options?.timeout,
    retryable: false,
  });
}
