/**
 * Pipeline Monitoring and Visualization
 *
 * Tools for monitoring pipeline execution, collecting metrics,
 * and visualizing pipeline flow and performance.
 */

import type {
  Pipeline,
  PipelineEvent,
  PipelineMetrics,
  PipelineResult,
  PipelineContext,
  StageResult,
} from "./types.js";

/**
 * Pipeline execution trace
 */
export interface ExecutionTrace {
  executionId: string;
  pipelineName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  input: unknown;
  output?: unknown;
  error?: string;
  stages: Array<{
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    success: boolean;
    error?: string;
    attempts?: number;
  }>;
}

/**
 * Pipeline monitor for tracking executions
 */
export class PipelineMonitor {
  private traces = new Map<string, ExecutionTrace>();
  private metrics = new Map<
    string,
    {
      totalExecutions: number;
      successfulExecutions: number;
      failedExecutions: number;
      totalDuration: number;
      stageMetrics: Map<
        string,
        {
          executions: number;
          successes: number;
          failures: number;
          totalDuration: number;
        }
      >;
    }
  >();

  /**
   * Start monitoring a pipeline execution
   */
  startExecution(
    executionId: string,
    pipelineName: string,
    input: unknown,
  ): void {
    this.traces.set(executionId, {
      executionId,
      pipelineName,
      startTime: Date.now(),
      input,
      stages: [],
    });

    // Initialize metrics for pipeline if not exists
    if (!this.metrics.has(pipelineName)) {
      this.metrics.set(pipelineName, {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalDuration: 0,
        stageMetrics: new Map(),
      });
    }

    const metrics = this.metrics.get(pipelineName)!;
    metrics.totalExecutions++;
  }

  /**
   * Record stage start
   */
  startStage(executionId: string, stageName: string): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;

    trace.stages.push({
      name: stageName,
      startTime: Date.now(),
      success: false,
    });
  }

  /**
   * Record stage completion
   */
  completeStage(
    executionId: string,
    stageName: string,
    success: boolean,
    error?: string,
    attempts?: number,
  ): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;

    const stage = trace.stages.find((s) => s.name === stageName && !s.endTime);
    if (stage) {
      stage.endTime = Date.now();
      stage.duration = stage.endTime - stage.startTime;
      stage.success = success;
      stage.error = error;
      stage.attempts = attempts;
    }

    // Update stage metrics
    const metrics = this.metrics.get(trace.pipelineName);
    if (metrics) {
      if (!metrics.stageMetrics.has(stageName)) {
        metrics.stageMetrics.set(stageName, {
          executions: 0,
          successes: 0,
          failures: 0,
          totalDuration: 0,
        });
      }

      const stageMetrics = metrics.stageMetrics.get(stageName)!;
      stageMetrics.executions++;
      if (success) {
        stageMetrics.successes++;
      } else {
        stageMetrics.failures++;
      }
      if (stage?.duration) {
        stageMetrics.totalDuration += stage.duration;
      }
    }
  }

  /**
   * Complete pipeline execution
   */
  completeExecution(
    executionId: string,
    success: boolean,
    output?: unknown,
    error?: string,
  ): void {
    const trace = this.traces.get(executionId);
    if (!trace) return;

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.success = success;
    trace.output = output;
    trace.error = error;

    // Update pipeline metrics
    const metrics = this.metrics.get(trace.pipelineName);
    if (metrics) {
      if (success) {
        metrics.successfulExecutions++;
      } else {
        metrics.failedExecutions++;
      }
      metrics.totalDuration += trace.duration;
    }
  }

  /**
   * Get execution trace
   */
  getTrace(executionId: string): ExecutionTrace | undefined {
    return this.traces.get(executionId);
  }

  /**
   * Get all traces
   */
  getAllTraces(): ExecutionTrace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Get traces for a specific pipeline
   */
  getTracesForPipeline(pipelineName: string): ExecutionTrace[] {
    return Array.from(this.traces.values()).filter(
      (t) => t.pipelineName === pipelineName,
    );
  }

  /**
   * Get metrics for a pipeline
   */
  getMetrics(pipelineName: string): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageDuration: number;
    successRate: number;
    stages: Array<{
      name: string;
      executions: number;
      successRate: number;
      averageDuration: number;
    }>;
  } | null {
    const metrics = this.metrics.get(pipelineName);
    if (!metrics) return null;

    const stages = Array.from(metrics.stageMetrics.entries()).map(
      ([name, m]) => ({
        name,
        executions: m.executions,
        successRate: m.executions > 0 ? m.successes / m.executions : 0,
        averageDuration: m.executions > 0 ? m.totalDuration / m.executions : 0,
      }),
    );

    return {
      totalExecutions: metrics.totalExecutions,
      successfulExecutions: metrics.successfulExecutions,
      failedExecutions: metrics.failedExecutions,
      averageDuration:
        metrics.totalExecutions > 0
          ? metrics.totalDuration / metrics.totalExecutions
          : 0,
      successRate:
        metrics.totalExecutions > 0
          ? metrics.successfulExecutions / metrics.totalExecutions
          : 0,
      stages,
    };
  }

  /**
   * Get slow stages (above threshold)
   */
  getSlowStages(
    pipelineName: string,
    thresholdMs: number = 5000,
  ): Array<{ name: string; averageDuration: number }> {
    const metrics = this.metrics.get(pipelineName);
    if (!metrics) return [];

    return Array.from(metrics.stageMetrics.entries())
      .map(([name, m]) => ({
        name,
        averageDuration: m.executions > 0 ? m.totalDuration / m.executions : 0,
      }))
      .filter((s) => s.averageDuration > thresholdMs)
      .sort((a, b) => b.averageDuration - a.averageDuration);
  }

  /**
   * Clear traces older than specified time
   */
  clearOldTraces(olderThanMs: number = 3600000): number {
    const cutoff = Date.now() - olderThanMs;
    let cleared = 0;

    for (const [id, trace] of this.traces.entries()) {
      if (trace.endTime && trace.endTime < cutoff) {
        this.traces.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clear all traces
   */
  clearAllTraces(): void {
    this.traces.clear();
  }

  /**
   * Reset all metrics
   */
  resetMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Generate text visualization of a trace
   */
  visualizeTrace(executionId: string): string {
    const trace = this.traces.get(executionId);
    if (!trace) return "Trace not found";

    const lines: string[] = [];
    lines.push(`Pipeline: ${trace.pipelineName}`);
    lines.push(`Execution ID: ${trace.executionId}`);
    lines.push(`Status: ${trace.success ? "✓ Success" : "✗ Failed"}`);
    lines.push(`Duration: ${trace.duration}ms`);
    lines.push("");
    lines.push("Stages:");

    for (const stage of trace.stages) {
      const status = stage.success ? "✓" : "✗";
      const duration = stage.duration ? `${stage.duration}ms` : "N/A";
      const attempts =
        stage.attempts && stage.attempts > 1
          ? ` (${stage.attempts} attempts)`
          : "";
      lines.push(`  ${status} ${stage.name} - ${duration}${attempts}`);
      if (stage.error) {
        lines.push(`      Error: ${stage.error}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Generate ASCII flow diagram
   */
  visualizeFlow(pipelineName: string): string {
    const traces = this.getTracesForPipeline(pipelineName);
    if (traces.length === 0) return "No traces found";

    const recentTrace = traces[traces.length - 1];
    const lines: string[] = [];

    lines.push(`┌─ ${pipelineName} ─┐`);
    lines.push("│");

    for (let i = 0; i < recentTrace.stages.length; i++) {
      const stage = recentTrace.stages[i];
      const status = stage.success ? "✓" : "✗";
      const isLast = i === recentTrace.stages.length - 1;

      lines.push(`├─ ${status} ${stage.name}`);
      if (!isLast) {
        lines.push("│  ↓");
      }
    }

    lines.push("└─────────────────────");

    return lines.join("\n");
  }
}

/**
 * Create a monitoring middleware
 */
export function createMonitoringMiddleware(monitor: PipelineMonitor) {
  return {
    name: "monitoring",
    onPipelineStart: async (context: PipelineContext) => {
      const pipelineName = (context.metadata as any).pipelineName || "unknown";
      monitor.startExecution(context.executionId, pipelineName, context.input);
    },
    onStageStart: async (context: PipelineContext, stage: any) => {
      monitor.startStage(context.executionId, stage.name);
    },
    onStageComplete: async (
      context: PipelineContext,
      stage: any,
      result: StageResult,
    ) => {
      monitor.completeStage(
        context.executionId,
        stage.name,
        result.success,
        result.error?.message,
        result.metadata?.attempts,
      );
    },
    onPipelineComplete: async (
      context: PipelineContext,
      result: PipelineResult,
    ) => {
      monitor.completeExecution(
        context.executionId,
        result.success,
        result.output,
        result.error?.message,
      );
    },
  };
}

/**
 * Real-time pipeline event stream
 */
export class PipelineEventStream {
  private listeners: Array<(event: PipelineEvent) => void> = [];

  /**
   * Subscribe to pipeline events
   */
  subscribe(listener: (event: PipelineEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event
   */
  emit(event: PipelineEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in event listener:", error);
      }
    }
  }

  /**
   * Create a middleware that emits events
   */
  createMiddleware() {
    return {
      name: "event-stream",
      onPipelineStart: async (context: PipelineContext) => {
        this.emit({
          type: "pipeline-start",
          timestamp: Date.now(),
          executionId: context.executionId,
          data: { input: context.input },
        });
      },
      onStageStart: async (context: PipelineContext, stage: any) => {
        this.emit({
          type: "stage-start",
          timestamp: Date.now(),
          executionId: context.executionId,
          stageName: stage.name,
        });
      },
      onStageComplete: async (
        context: PipelineContext,
        stage: any,
        result: StageResult,
      ) => {
        this.emit({
          type: "stage-complete",
          timestamp: Date.now(),
          executionId: context.executionId,
          stageName: stage.name,
          data: {
            success: result.success,
            duration: result.metadata?.duration,
          },
        });
      },
      onPipelineComplete: async (
        context: PipelineContext,
        result: PipelineResult,
      ) => {
        this.emit({
          type: "pipeline-complete",
          timestamp: Date.now(),
          executionId: context.executionId,
          data: {
            success: result.success,
            duration: result.metrics.totalDuration,
          },
        });
      },
      onError: async (context: PipelineContext, error: Error, stage?: any) => {
        this.emit({
          type: "stage-error",
          timestamp: Date.now(),
          executionId: context.executionId,
          stageName: stage?.name,
          error,
        });
      },
    };
  }
}

/**
 * Pipeline health checker
 */
export class PipelineHealthChecker {
  constructor(private monitor: PipelineMonitor) {}

  /**
   * Check if pipeline is healthy
   */
  checkHealth(pipelineName: string): {
    healthy: boolean;
    issues: string[];
    metrics: any;
  } {
    const issues: string[] = [];
    const metrics = this.monitor.getMetrics(pipelineName);

    if (!metrics) {
      return {
        healthy: false,
        issues: ["No metrics available"],
        metrics: null,
      };
    }

    // Check success rate
    if (metrics.successRate < 0.9) {
      issues.push(
        `Low success rate: ${(metrics.successRate * 100).toFixed(1)}%`,
      );
    }

    // Check for slow stages
    const slowStages = this.monitor.getSlowStages(pipelineName, 10000);
    if (slowStages.length > 0) {
      issues.push(
        `Slow stages: ${slowStages.map((s) => `${s.name} (${s.averageDuration.toFixed(0)}ms)`).join(", ")}`,
      );
    }

    // Check for frequently failing stages
    for (const stage of metrics.stages) {
      if (stage.successRate < 0.8) {
        issues.push(
          `Stage "${stage.name}" has low success rate: ${(stage.successRate * 100).toFixed(1)}%`,
        );
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      metrics,
    };
  }
}
