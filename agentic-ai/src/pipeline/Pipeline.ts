/**
 * Pipeline Implementation
 *
 * Core pipeline orchestration with assembly line pattern, middleware support,
 * caching, metrics, and event streaming.
 */

import { randomUUID } from "crypto";
import type {
  Pipeline as IPipeline,
  PipelineOptions,
  PipelineStage,
  PipelineMiddleware,
  PipelineContext,
  PipelineResult,
  StageResult,
  PipelineEvent,
  PipelineMetrics,
  ValidationResult,
  CacheEntry,
} from "./types.js";
import type { Blackboard } from "../core/types.js";

/**
 * Default pipeline options
 */
const DEFAULT_OPTIONS: PipelineOptions = {
  name: "unnamed-pipeline",
  defaultTimeout: 300000, // 5 minutes
  continueOnError: false,
  maxConcurrency: 1,
  enableCaching: false,
  cacheTTL: 3600000, // 1 hour
  enableStreaming: false,
};

/**
 * Main pipeline implementation with assembly line pattern
 */
export class Pipeline<
  TInput = unknown,
  TOutput = unknown,
  TState = Record<string, unknown>,
> implements IPipeline<TInput, TOutput, TState>
{
  public readonly options: PipelineOptions;
  public readonly stages: PipelineStage<unknown, unknown, TState>[] = [];
  public readonly middleware: PipelineMiddleware<TState>[] = [];

  private readonly cache = new Map<string, CacheEntry>();
  private readonly metrics = new Map<
    string,
    {
      executions: number;
      successes: number;
      failures: number;
      totalDuration: number;
      retries: number;
    }
  >();

  private executionCount = 0;
  private successCount = 0;
  private failureCount = 0;

  constructor(options: Partial<PipelineOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  addStage(stage: PipelineStage<unknown, unknown, TState>): this {
    this.stages.push(stage);

    // Initialize metrics for this stage
    if (!this.metrics.has(stage.name)) {
      this.metrics.set(stage.name, {
        executions: 0,
        successes: 0,
        failures: 0,
        totalDuration: 0,
        retries: 0,
      });
    }

    return this;
  }

  addMiddleware(middleware: PipelineMiddleware<TState>): this {
    this.middleware.push(middleware);
    return this;
  }

  async execute(
    input: TInput,
    signal?: AbortSignal,
  ): Promise<PipelineResult<TOutput, TState>> {
    return this.executeInternal(input, signal);
  }

  async executeStream(
    input: TInput,
    onEvent: (event: PipelineEvent) => void,
    signal?: AbortSignal,
  ): Promise<PipelineResult<TOutput, TState>> {
    return this.executeInternal(input, signal, onEvent);
  }

  private async executeInternal(
    input: TInput,
    signal?: AbortSignal,
    onEvent?: (event: PipelineEvent) => void,
  ): Promise<PipelineResult<TOutput, TState>> {
    const executionId = randomUUID();
    const startTime = Date.now();
    this.executionCount++;

    // Check cache if enabled
    if (this.options.enableCaching) {
      const cachedResult = this.getFromCache(input);
      if (cachedResult) {
        return cachedResult as PipelineResult<TOutput, TState>;
      }
    }

    // Initialize context
    const context: PipelineContext<TInput, TState> = {
      executionId,
      input,
      state: {} as TState,
      blackboard: this.createEmptyBlackboard(),
      messages: [],
      metadata: {
        startTime,
        completedStages: [],
        failedStages: [],
      },
      signal,
    };

    const stageResults = new Map<string, StageResult>();
    let finalOutput: TOutput | undefined;
    let pipelineError: Error | undefined;

    // Emit pipeline start event
    this.emitEvent(onEvent, {
      type: "pipeline-start",
      timestamp: Date.now(),
      executionId,
      data: { input, options: this.options },
    });

    try {
      // Call middleware: onPipelineStart
      await this.callMiddleware("onPipelineStart", context);

      // Execute stages in sequence
      for (const stage of this.stages) {
        if (signal?.aborted) {
          throw new Error("Pipeline execution aborted");
        }

        // Validate stage if validation is defined
        if (stage.validate) {
          const isValid = await stage.validate(context);
          if (!isValid) {
            const error = new Error(`Stage ${stage.name} validation failed`);
            stageResults.set(stage.name, {
              success: false,
              error,
              continue: false,
            });

            if (!this.options.continueOnError) {
              throw error;
            }
            continue;
          }
        }

        // Execute stage with middleware hooks
        const stageResult = await this.executeStage(stage, context, onEvent);
        stageResults.set(stage.name, stageResult);

        // Update metrics
        this.updateStageMetrics(stage.name, stageResult);

        // Check if we should continue
        if (!stageResult.success) {
          context.metadata.failedStages.push(stage.name);

          if (!this.options.continueOnError) {
            throw stageResult.error || new Error(`Stage ${stage.name} failed`);
          }
        } else {
          context.metadata.completedStages.push(stage.name);

          // Store stage output in state
          if (stageResult.output !== undefined) {
            (context.state as any)[stage.name] = stageResult.output;
            finalOutput = stageResult.output as TOutput;
          }
        }

        if (!stageResult.continue) {
          break;
        }

        // Handle branching if specified
        if (stageResult.branch) {
          // Find and execute branch stages (implementation can be extended)
          break;
        }

        // Cleanup stage
        if (stage.cleanup) {
          await stage.cleanup(context);
        }
      }

      this.successCount++;
    } catch (error) {
      pipelineError = error instanceof Error ? error : new Error(String(error));
      this.failureCount++;

      // Call middleware: onError
      await this.callMiddleware("onError", context, pipelineError);

      this.emitEvent(onEvent, {
        type: "stage-error",
        timestamp: Date.now(),
        executionId,
        error: pipelineError,
      });
    }

    // Build result
    const result: PipelineResult<TOutput, TState> = {
      success: !pipelineError,
      output: finalOutput,
      error: pipelineError,
      context,
      stageResults,
      metrics: {
        totalDuration: Date.now() - startTime,
        stageCount: this.stages.length,
        successfulStages: context.metadata.completedStages.length,
        failedStages: context.metadata.failedStages.length,
        retriedStages: Array.from(stageResults.values()).filter(
          (r) => (r.metadata?.attempts ?? 0) > 1,
        ).length,
        toolCallsTotal: Array.from(stageResults.values()).reduce(
          (sum, r) => sum + (r.metadata?.toolCalls?.length ?? 0),
          0,
        ),
      },
    };

    // Call middleware: onPipelineComplete
    await this.callMiddleware("onPipelineComplete", context, result);

    // Emit pipeline complete event
    this.emitEvent(onEvent, {
      type: "pipeline-complete",
      timestamp: Date.now(),
      executionId,
      data: { success: result.success, metrics: result.metrics },
    });

    // Cache result if enabled and successful
    if (this.options.enableCaching && result.success) {
      this.addToCache(input, result);
    }

    return result;
  }

  private async executeStage(
    stage: PipelineStage<unknown, unknown, TState>,
    context: PipelineContext<unknown, TState>,
    onEvent?: (event: PipelineEvent) => void,
  ): Promise<StageResult> {
    const startTime = Date.now();

    context.metadata.currentStage = stage.name;

    // Emit stage start event
    this.emitEvent(onEvent, {
      type: "stage-start",
      timestamp: Date.now(),
      executionId: context.executionId,
      stageName: stage.name,
    });

    // Call middleware: onStageStart
    await this.callMiddleware("onStageStart", context, stage);

    // Execute stage with timeout if configured
    const timeout = stage.timeout ?? this.options.defaultTimeout;
    let result: StageResult;

    try {
      if (timeout) {
        result = await this.executeWithTimeout(
          stage as any,
          context as any,
          timeout,
        );
      } else {
        result = await stage.execute(context);
      }

      // Update stage metrics
      const stageMetrics = this.metrics.get(stage.name);
      if (stageMetrics) {
        stageMetrics.executions++;
        if (result.success) {
          stageMetrics.successes++;
        } else {
          stageMetrics.failures++;
        }
        stageMetrics.totalDuration += result.metadata?.duration ?? 0;
      }
    } catch (error) {
      result = {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        continue: false,
        metadata: {
          duration: Date.now() - startTime,
        },
      };
    }

    // Call middleware: onStageComplete
    await this.callMiddleware("onStageComplete", context, stage, result);

    // Emit stage complete event
    this.emitEvent(onEvent, {
      type: "stage-complete",
      timestamp: Date.now(),
      executionId: context.executionId,
      stageName: stage.name,
      data: { success: result.success, duration: result.metadata?.duration },
    });

    return result;
  }

  private async executeWithTimeout(
    stage: PipelineStage,
    context: PipelineContext,
    timeout: number,
  ): Promise<StageResult> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Stage ${stage.name} timed out after ${timeout}ms`));
      }, timeout);

      stage
        .execute(context)
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

  private async callMiddleware(
    hook: "onPipelineStart",
    context: PipelineContext<unknown, TState>,
  ): Promise<void>;
  private async callMiddleware(
    hook: "onPipelineComplete",
    context: PipelineContext<unknown, TState>,
    result: PipelineResult<unknown, TState>,
  ): Promise<void>;
  private async callMiddleware(
    hook: "onStageStart",
    context: PipelineContext<unknown, TState>,
    stage: PipelineStage<unknown, unknown, TState>,
  ): Promise<void>;
  private async callMiddleware(
    hook: "onStageComplete",
    context: PipelineContext<unknown, TState>,
    stage: PipelineStage<unknown, unknown, TState>,
    result: StageResult,
  ): Promise<void>;
  private async callMiddleware(
    hook: "onError",
    context: PipelineContext<unknown, TState>,
    error: Error,
    stage?: PipelineStage<unknown, unknown, TState>,
  ): Promise<void>;
  private async callMiddleware(
    hook: keyof PipelineMiddleware,
    ...args: any[]
  ): Promise<void> {
    for (const mw of this.middleware) {
      const fn = mw[hook];
      if (typeof fn === "function") {
        await (fn as any).apply(mw, args);
      }
    }
  }

  private emitEvent(
    onEvent: ((event: PipelineEvent) => void) | undefined,
    event: PipelineEvent,
  ): void {
    if (this.options.enableStreaming && onEvent) {
      onEvent(event);
    }
  }

  private updateStageMetrics(stageName: string, result: StageResult): void {
    const metrics = this.metrics.get(stageName);
    if (metrics) {
      if ((result.metadata?.attempts ?? 1) > 1) {
        metrics.retries += (result.metadata?.attempts ?? 1) - 1;
      }
    }
  }

  private createEmptyBlackboard(): Blackboard {
    return {
      zpids: [],
      plan: undefined,
      parsed: undefined,
      analytics: undefined,
      mapLink: null,
      mortgage: null,
      affordability: null,
      pairs: undefined,
      compliance: null,
    };
  }

  private getFromCache(input: TInput): PipelineResult<TOutput> | null {
    const cacheKey = this.getCacheKey(input);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    entry.hits++;
    return entry.value as PipelineResult<TOutput>;
  }

  private addToCache(
    input: TInput,
    result: PipelineResult<TOutput, TState>,
  ): void {
    const cacheKey = this.getCacheKey(input);
    const ttl = this.options.cacheTTL ?? 3600000;

    this.cache.set(cacheKey, {
      key: cacheKey,
      value: result,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      hits: 0,
    });
  }

  private getCacheKey(input: TInput): string {
    return `${this.options.name}:${JSON.stringify(input)}`;
  }

  async validate(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate stage names
    const stageNames = new Set<string>();
    for (const stage of this.stages) {
      if (stageNames.has(stage.name)) {
        errors.push(`Duplicate stage name: ${stage.name}`);
      }
      stageNames.add(stage.name);
    }

    // Check for at least one stage
    if (this.stages.length === 0) {
      errors.push("Pipeline must have at least one stage");
    }

    // Warn about missing middleware
    if (this.middleware.length === 0) {
      warnings.push(
        "No middleware registered - consider adding logging or metrics middleware",
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  getMetrics(): PipelineMetrics {
    const stageMetrics = new Map();

    for (const [stageName, metrics] of this.metrics.entries()) {
      stageMetrics.set(stageName, {
        executions: metrics.executions,
        successes: metrics.successes,
        failures: metrics.failures,
        averageDuration:
          metrics.executions > 0
            ? metrics.totalDuration / metrics.executions
            : 0,
        retries: metrics.retries,
      });
    }

    return {
      pipelineName: this.options.name,
      totalExecutions: this.executionCount,
      successfulExecutions: this.successCount,
      failedExecutions: this.failureCount,
      averageDuration: 0, // Can be computed from stage metrics
      stageMetrics,
      lastExecutionTime: Date.now(),
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}
