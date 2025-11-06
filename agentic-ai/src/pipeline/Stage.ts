/**
 * Pipeline Stage Implementation
 *
 * Represents a single stage in the assembly line pipeline with built-in
 * retry logic, timeout handling, and validation.
 */

import type { PipelineStage, PipelineContext, StageResult } from "./types.js";

/**
 * Configuration for creating a stage
 */
export interface StageConfig<
  TInput = unknown,
  TOutput = unknown,
  TState = Record<string, unknown>,
> {
  name: string;
  description?: string;
  execute: (context: PipelineContext<TInput, TState>) => Promise<TOutput>;
  validate?: (
    context: PipelineContext<TInput, TState>,
  ) => Promise<boolean> | boolean;
  cleanup?: (context: PipelineContext<TInput, TState>) => Promise<void>;
  retryable?: boolean;
  maxRetries?: number;
  timeout?: number;
  retryDelay?: number;
}

/**
 * Base implementation of a pipeline stage
 */
export class Stage<
  TInput = unknown,
  TOutput = unknown,
  TState = Record<string, unknown>,
> implements PipelineStage<TInput, TOutput, TState>
{
  public readonly name: string;
  public readonly description?: string;
  public readonly retryable: boolean;
  public readonly maxRetries: number;
  public readonly timeout?: number;

  private readonly executeImpl: (
    context: PipelineContext<TInput, TState>,
  ) => Promise<TOutput>;
  private readonly validateImpl?: (
    context: PipelineContext<TInput, TState>,
  ) => Promise<boolean> | boolean;
  private readonly cleanupImpl?: (
    context: PipelineContext<TInput, TState>,
  ) => Promise<void>;
  private readonly retryDelay: number;

  constructor(config: StageConfig<TInput, TOutput, TState>) {
    this.name = config.name;
    this.description = config.description;
    this.executeImpl = config.execute;
    this.validateImpl = config.validate;
    this.cleanupImpl = config.cleanup;
    this.retryable = config.retryable ?? false;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  async execute(
    context: PipelineContext<TInput, TState>,
  ): Promise<StageResult<TOutput>> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts <= (this.retryable ? this.maxRetries : 0)) {
      try {
        // Check abort signal
        if (context.signal?.aborted) {
          throw new Error("Pipeline execution aborted");
        }

        // Execute with timeout if specified
        const output = this.timeout
          ? await this.executeWithTimeout(context, this.timeout)
          : await this.executeImpl(context);

        return {
          success: true,
          output,
          continue: true,
          metadata: {
            duration: Date.now() - startTime,
            attempts: attempts + 1,
          },
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempts++;

        if (attempts > this.maxRetries || !this.retryable) {
          break;
        }

        // Wait before retry with exponential backoff
        await this.delay(this.retryDelay * Math.pow(2, attempts - 1));
      }
    }

    return {
      success: false,
      error: lastError,
      continue: false,
      metadata: {
        duration: Date.now() - startTime,
        attempts,
      },
    };
  }

  async validate(context: PipelineContext<TInput, TState>): Promise<boolean> {
    if (!this.validateImpl) {
      return true;
    }
    return await this.validateImpl(context);
  }

  async cleanup(context: PipelineContext<TInput, TState>): Promise<void> {
    if (this.cleanupImpl) {
      await this.cleanupImpl(context);
    }
  }

  private async executeWithTimeout(
    context: PipelineContext<TInput, TState>,
    timeout: number,
  ): Promise<TOutput> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Stage ${this.name} timed out after ${timeout}ms`));
      }, timeout);

      this.executeImpl(context)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create a simple stage with just an execution function
 */
export function createStage<
  TInput = unknown,
  TOutput = unknown,
  TState = Record<string, unknown>,
>(
  name: string,
  execute: (context: PipelineContext<TInput, TState>) => Promise<TOutput>,
  options?: Partial<
    Omit<StageConfig<TInput, TOutput, TState>, "name" | "execute">
  >,
): Stage<TInput, TOutput, TState> {
  return new Stage({
    name,
    execute,
    ...options,
  });
}

/**
 * Create a transformation stage that modifies the context state
 */
export function createTransformStage<TState = Record<string, unknown>>(
  name: string,
  transform: (state: TState) => Promise<Partial<TState>> | Partial<TState>,
  options?: Partial<
    Omit<StageConfig<unknown, unknown, TState>, "name" | "execute">
  >,
): Stage<unknown, unknown, TState> {
  return new Stage({
    name,
    execute: async (context) => {
      const updates = await transform(context.state);
      Object.assign(context.state as object, updates);
      return updates;
    },
    ...options,
  });
}

/**
 * Create a conditional stage that only executes if condition is met
 */
export function createConditionalStage<
  TInput = unknown,
  TOutput = unknown,
  TState = Record<string, unknown>,
>(
  name: string,
  condition: (
    context: PipelineContext<TInput, TState>,
  ) => Promise<boolean> | boolean,
  execute: (context: PipelineContext<TInput, TState>) => Promise<TOutput>,
  options?: Partial<
    Omit<StageConfig<TInput, TOutput, TState>, "name" | "execute">
  >,
): Stage<TInput, TOutput, TState> {
  return new Stage({
    name,
    execute: async (context) => {
      const shouldExecute = await condition(context);
      if (!shouldExecute) {
        throw new Error(`Condition not met for stage ${name}`);
      }
      return execute(context);
    },
    ...options,
  });
}

/**
 * Create a parallel stage that executes multiple operations concurrently
 */
export function createParallelStage<
  TInput = unknown,
  TOutput = unknown,
  TState = Record<string, unknown>,
>(
  name: string,
  operations: Array<
    (context: PipelineContext<TInput, TState>) => Promise<unknown>
  >,
  options?: Partial<
    Omit<StageConfig<TInput, TOutput, TState>, "name" | "execute">
  >,
): Stage<TInput, TOutput[], TState> {
  return new Stage({
    name,
    execute: async (context) => {
      const results = await Promise.all(operations.map((op) => op(context)));
      return results as TOutput[];
    },
    ...options,
  });
}
