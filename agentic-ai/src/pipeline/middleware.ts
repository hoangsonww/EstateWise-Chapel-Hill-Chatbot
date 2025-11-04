/**
 * Pipeline Middleware Implementations
 *
 * Built-in middleware for common cross-cutting concerns like logging,
 * metrics, caching, validation, error recovery, and more.
 */

import type {
  PipelineMiddleware,
  PipelineContext,
  PipelineResult,
  PipelineStage,
  StageResult,
} from "./types.js";

/**
 * Logging middleware with configurable log levels
 */
export function createLoggingMiddleware(options?: {
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logger?: Console;
  includeContext?: boolean;
}): PipelineMiddleware {
  const logger = options?.logger ?? console;
  const logLevel = options?.logLevel ?? 'info';
  const includeContext = options?.includeContext ?? false;

  return {
    name: 'logging',
    onPipelineStart: async (context) => {
      if (logLevel === 'debug' || logLevel === 'info') {
        logger.log(
          `🚀 [Pipeline Start] Execution ID: ${context.executionId}${
            includeContext ? `, Input: ${JSON.stringify(context.input)}` : ''
          }`
        );
      }
    },
    onPipelineComplete: async (context, result) => {
      const emoji = result.success ? '✅' : '❌';
      if (logLevel === 'debug' || logLevel === 'info') {
        logger.log(
          `${emoji} [Pipeline Complete] ${context.executionId} - Success: ${result.success}, Duration: ${result.metrics.totalDuration}ms, Stages: ${result.metrics.successfulStages}/${result.metrics.stageCount}`
        );
      }
    },
    onStageStart: async (context, stage) => {
      if (logLevel === 'debug') {
        logger.log(`  ▶️  [Stage Start] ${stage.name} - ${stage.description || ''}`);
      }
    },
    onStageComplete: async (context, stage, result) => {
      if (logLevel === 'debug') {
        const emoji = result.success ? '✓' : '✗';
        logger.log(
          `  ${emoji} [Stage Complete] ${stage.name} - Duration: ${result.metadata?.duration}ms`
        );
      }
    },
    onError: async (context, error, stage) => {
      if (logLevel === 'error' || logLevel === 'warn' || logLevel === 'info') {
        logger.error(
          `❌ [Error] ${stage ? `Stage "${stage.name}"` : 'Pipeline'}: ${error.message}`,
          error
        );
      }
    },
  };
}

/**
 * Metrics collection middleware with aggregation
 */
export function createMetricsMiddleware(options: {
  onMetrics: (metrics: {
    executionId: string;
    pipelineName?: string;
    success: boolean;
    duration: number;
    stageMetrics: Array<{
      name: string;
      success: boolean;
      duration: number;
      attempts?: number;
    }>;
    toolCalls: number;
    timestamp: number;
  }) => void | Promise<void>;
}): PipelineMiddleware {
  const stageMetrics: Array<{
    name: string;
    success: boolean;
    duration: number;
    attempts?: number;
  }> = [];

  return {
    name: 'metrics',
    onPipelineStart: async () => {
      stageMetrics.length = 0; // Reset for new execution
    },
    onStageComplete: async (context, stage, result) => {
      stageMetrics.push({
        name: stage.name,
        success: result.success,
        duration: result.metadata?.duration ?? 0,
        attempts: result.metadata?.attempts,
      });
    },
    onPipelineComplete: async (context, result) => {
      await options.onMetrics({
        executionId: context.executionId,
        success: result.success,
        duration: result.metrics.totalDuration,
        stageMetrics: [...stageMetrics],
        toolCalls: result.metrics.toolCallsTotal,
        timestamp: Date.now(),
      });
    },
  };
}

/**
 * Performance monitoring middleware
 */
export function createPerformanceMiddleware(options?: {
  slowThreshold?: number;
  onSlowStage?: (stageName: string, duration: number) => void;
  onSlowPipeline?: (duration: number) => void;
}): PipelineMiddleware {
  const slowThreshold = options?.slowThreshold ?? 5000; // 5 seconds

  return {
    name: 'performance',
    onStageComplete: async (context, stage, result) => {
      const duration = result.metadata?.duration ?? 0;
      if (duration > slowThreshold && options?.onSlowStage) {
        options.onSlowStage(stage.name, duration);
      }
    },
    onPipelineComplete: async (context, result) => {
      if (result.metrics.totalDuration > slowThreshold * 2 && options?.onSlowPipeline) {
        options.onSlowPipeline(result.metrics.totalDuration);
      }
    },
  };
}

/**
 * Error recovery middleware with retry logic
 */
export function createErrorRecoveryMiddleware(options: {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number, error: Error) => void;
  shouldRetry?: (error: Error) => boolean;
}): PipelineMiddleware {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;
  let retryCount = 0;

  return {
    name: 'error-recovery',
    onPipelineStart: async () => {
      retryCount = 0;
    },
    onError: async (context, error) => {
      const shouldRetry = options.shouldRetry
        ? options.shouldRetry(error)
        : retryCount < maxRetries;

      if (shouldRetry) {
        retryCount++;
        if (options.onRetry) {
          options.onRetry(retryCount, error);
        }

        // Exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * Math.pow(2, retryCount - 1))
        );
      }
    },
  };
}

/**
 * Validation middleware for input/output
 */
export function createValidationMiddleware(options: {
  validateInput?: (input: unknown) => Promise<boolean> | boolean;
  validateOutput?: (output: unknown) => Promise<boolean> | boolean;
  onValidationError?: (type: 'input' | 'output', error: Error) => void;
}): PipelineMiddleware {
  return {
    name: 'validation',
    onPipelineStart: async (context) => {
      if (options.validateInput) {
        try {
          const isValid = await options.validateInput(context.input);
          if (!isValid) {
            const error = new Error('Input validation failed');
            if (options.onValidationError) {
              options.onValidationError('input', error);
            }
            throw error;
          }
        } catch (error) {
          const validationError =
            error instanceof Error ? error : new Error('Input validation error');
          if (options.onValidationError) {
            options.onValidationError('input', validationError);
          }
          throw validationError;
        }
      }
    },
    onPipelineComplete: async (context, result) => {
      if (options.validateOutput && result.success) {
        try {
          const isValid = await options.validateOutput(result.output);
          if (!isValid) {
            const error = new Error('Output validation failed');
            if (options.onValidationError) {
              options.onValidationError('output', error);
            }
            throw error;
          }
        } catch (error) {
          const validationError =
            error instanceof Error ? error : new Error('Output validation error');
          if (options.onValidationError) {
            options.onValidationError('output', validationError);
          }
          throw validationError;
        }
      }
    },
  };
}

/**
 * Rate limiting middleware
 */
export function createRateLimitMiddleware(options: {
  maxRequestsPerWindow: number;
  windowMs: number;
  onRateLimitExceeded?: () => void;
}): PipelineMiddleware {
  const requests: number[] = [];

  return {
    name: 'rate-limit',
    onPipelineStart: async () => {
      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Remove old requests outside the window
      while (requests.length > 0 && requests[0] < windowStart) {
        requests.shift();
      }

      // Check if limit is exceeded
      if (requests.length >= options.maxRequestsPerWindow) {
        if (options.onRateLimitExceeded) {
          options.onRateLimitExceeded();
        }
        throw new Error(
          `Rate limit exceeded: ${options.maxRequestsPerWindow} requests per ${options.windowMs}ms`
        );
      }

      requests.push(now);
    },
  };
}

/**
 * Audit logging middleware
 */
export function createAuditMiddleware(options: {
  onAudit: (event: {
    type: 'pipeline-start' | 'pipeline-complete' | 'stage-start' | 'stage-complete' | 'error';
    timestamp: number;
    executionId: string;
    stageName?: string;
    userId?: string;
    data: unknown;
  }) => void | Promise<void>;
  getUserId?: () => string;
}): PipelineMiddleware {
  return {
    name: 'audit',
    onPipelineStart: async (context) => {
      await options.onAudit({
        type: 'pipeline-start',
        timestamp: Date.now(),
        executionId: context.executionId,
        userId: options.getUserId?.(),
        data: { input: context.input },
      });
    },
    onPipelineComplete: async (context, result) => {
      await options.onAudit({
        type: 'pipeline-complete',
        timestamp: Date.now(),
        executionId: context.executionId,
        userId: options.getUserId?.(),
        data: {
          success: result.success,
          metrics: result.metrics,
          output: result.output,
        },
      });
    },
    onStageStart: async (context, stage) => {
      await options.onAudit({
        type: 'stage-start',
        timestamp: Date.now(),
        executionId: context.executionId,
        stageName: stage.name,
        userId: options.getUserId?.(),
        data: { stageName: stage.name },
      });
    },
    onStageComplete: async (context, stage, result) => {
      await options.onAudit({
        type: 'stage-complete',
        timestamp: Date.now(),
        executionId: context.executionId,
        stageName: stage.name,
        userId: options.getUserId?.(),
        data: { success: result.success, duration: result.metadata?.duration },
      });
    },
    onError: async (context, error, stage) => {
      await options.onAudit({
        type: 'error',
        timestamp: Date.now(),
        executionId: context.executionId,
        stageName: stage?.name,
        userId: options.getUserId?.(),
        data: { error: error.message, stack: error.stack },
      });
    },
  };
}

/**
 * Timeout middleware for entire pipeline
 */
export function createTimeoutMiddleware(options: {
  timeout: number;
  onTimeout?: () => void;
}): PipelineMiddleware {
  let timeoutId: NodeJS.Timeout | undefined;

  return {
    name: 'timeout',
    onPipelineStart: async (context) => {
      timeoutId = setTimeout(() => {
        if (options.onTimeout) {
          options.onTimeout();
        }
        if (context.signal) {
          // Trigger abort if signal is provided
          (context.signal as any).abort?.();
        }
      }, options.timeout);
    },
    onPipelineComplete: async () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    },
  };
}

/**
 * Circuit breaker middleware
 */
export function createCircuitBreakerMiddleware(options: {
  failureThreshold: number;
  resetTimeout: number;
  onCircuitOpen?: () => void;
  onCircuitClose?: () => void;
}): PipelineMiddleware {
  let failures = 0;
  let lastFailureTime = 0;
  let circuitOpen = false;

  return {
    name: 'circuit-breaker',
    onPipelineStart: async () => {
      // Check if circuit should be reset
      if (circuitOpen && Date.now() - lastFailureTime > options.resetTimeout) {
        circuitOpen = false;
        failures = 0;
        if (options.onCircuitClose) {
          options.onCircuitClose();
        }
      }

      // Reject if circuit is open
      if (circuitOpen) {
        throw new Error('Circuit breaker is open - too many failures');
      }
    },
    onPipelineComplete: async (context, result) => {
      if (!result.success) {
        failures++;
        lastFailureTime = Date.now();

        if (failures >= options.failureThreshold) {
          circuitOpen = true;
          if (options.onCircuitOpen) {
            options.onCircuitOpen();
          }
        }
      } else {
        // Reset on success
        failures = 0;
      }
    },
  };
}

/**
 * Tracing middleware for distributed tracing
 */
export function createTracingMiddleware(options: {
  serviceName: string;
  onSpan: (span: {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    name: string;
    timestamp: number;
    duration?: number;
    tags?: Record<string, string>;
    status: 'success' | 'error';
  }) => void | Promise<void>;
}): PipelineMiddleware {
  const spans = new Map<string, { timestamp: number; name: string }>();

  return {
    name: 'tracing',
    onPipelineStart: async (context) => {
      spans.set('pipeline', {
        timestamp: Date.now(),
        name: 'pipeline-execution',
      });
    },
    onStageStart: async (context, stage) => {
      spans.set(stage.name, {
        timestamp: Date.now(),
        name: stage.name,
      });
    },
    onStageComplete: async (context, stage, result) => {
      const span = spans.get(stage.name);
      if (span) {
        await options.onSpan({
          traceId: context.executionId,
          spanId: `${context.executionId}-${stage.name}`,
          parentSpanId: context.executionId,
          name: span.name,
          timestamp: span.timestamp,
          duration: Date.now() - span.timestamp,
          tags: {
            service: options.serviceName,
            stage: stage.name,
          },
          status: result.success ? 'success' : 'error',
        });
        spans.delete(stage.name);
      }
    },
    onPipelineComplete: async (context, result) => {
      const span = spans.get('pipeline');
      if (span) {
        await options.onSpan({
          traceId: context.executionId,
          spanId: context.executionId,
          name: span.name,
          timestamp: span.timestamp,
          duration: Date.now() - span.timestamp,
          tags: {
            service: options.serviceName,
          },
          status: result.success ? 'success' : 'error',
        });
        spans.delete('pipeline');
      }
    },
  };
}

/**
 * Context enrichment middleware
 */
export function createContextEnrichmentMiddleware(options: {
  enrich: (context: PipelineContext) => Promise<void> | void;
}): PipelineMiddleware {
  return {
    name: 'context-enrichment',
    onPipelineStart: async (context) => {
      await options.enrich(context);
    },
  };
}

/**
 * Caching middleware for pipeline results
 */
export function createCachingMiddleware<TState = Record<string, unknown>>(options: {
  ttl?: number;
  keyGenerator?: (context: PipelineContext<unknown, TState>) => string;
}): PipelineMiddleware<TState> {
  const cache = new Map<string, { value: any; expiresAt: number }>();
  const ttl = options.ttl || 300000; // Default 5 minutes

  return {
    name: 'caching',
    onPipelineStart: async (context) => {
      const key = options.keyGenerator
        ? options.keyGenerator(context)
        : `pipeline-cache:${JSON.stringify(context.input)}`;

      const cached = cache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        // Cache hit - store in context metadata
        (context.metadata as any).cacheHit = true;
        (context.metadata as any).cachedValue = cached.value;
      }
    },
    onPipelineComplete: async (context, result) => {
      if (result.success && !(context.metadata as any).cacheHit) {
        const key = options.keyGenerator
          ? options.keyGenerator(context)
          : `pipeline-cache:${JSON.stringify(context.input)}`;

        cache.set(key, {
          value: result.output,
          expiresAt: Date.now() + ttl,
        });
      }
    },
  };
}
