/**
 * Auto-Optimization and Performance Tuning
 *
 * ML-based pipeline optimization, performance analysis, bottleneck detection,
 * and automatic parameter tuning for optimal execution.
 */

import type { Pipeline, PipelineMetrics, PipelineResult } from './types.js';
import { PipelineMonitor } from './monitoring.js';

/**
 * Performance profile for a pipeline
 */
export interface PerformanceProfile {
  pipelineName: string;
  averageDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  successRate: number;
  throughput: number; // executions per minute
  stageProfiles: Map<string, StagePerformanceProfile>;
}

/**
 * Performance profile for a stage
 */
export interface StagePerformanceProfile {
  stageName: string;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  retryRate: number;
  percentOfTotalTime: number;
}

/**
 * Optimization recommendation
 */
export interface OptimizationRecommendation {
  type: 'parallelization' | 'caching' | 'timeout' | 'retry' | 'ordering' | 'removal';
  priority: 'high' | 'medium' | 'low';
  target: string; // stage name or pipeline name
  recommendation: string;
  expectedImprovement: string;
  autoApply?: boolean;
}

/**
 * Bottleneck analysis
 */
export interface BottleneckAnalysis {
  criticalPath: string[];
  bottlenecks: Array<{
    stageName: string;
    impact: number; // 0-1, percentage of total time
    reason: string;
  }>;
  parallelizationOpportunities: Array<{
    stages: string[];
    potentialSpeedup: number;
  }>;
}

/**
 * Pipeline optimizer
 */
export class PipelineOptimizer {
  private monitor: PipelineMonitor;
  private recommendations = new Map<string, OptimizationRecommendation[]>();

  constructor(monitor: PipelineMonitor) {
    this.monitor = monitor;
  }

  /**
   * Analyze pipeline performance
   */
  analyzePerformance(pipelineName: string): PerformanceProfile | null {
    const metrics = this.monitor.getMetrics(pipelineName);
    if (!metrics) return null;

    const traces = this.monitor.getTracesForPipeline(pipelineName);
    if (traces.length === 0) return null;

    // Calculate durations
    const durations = traces
      .filter(t => t.duration !== undefined)
      .map(t => t.duration!)
      .sort((a, b) => a - b);

    const p50 = this.percentile(durations, 50);
    const p95 = this.percentile(durations, 95);
    const p99 = this.percentile(durations, 99);

    // Calculate throughput
    const timespan = Math.max(...traces.map(t => t.endTime || 0)) -
      Math.min(...traces.map(t => t.startTime));
    const throughput = timespan > 0
      ? (traces.length / timespan) * 60000 // per minute
      : 0;

    // Stage profiles
    const stageProfiles = new Map<string, StagePerformanceProfile>();
    const totalTime = metrics.averageDuration;

    for (const [stageName, stageMetrics] of metrics.stageMetrics.entries()) {
      // Collect stage durations from traces
      const stageDurations: number[] = [];
      for (const trace of traces) {
        const stageExec = trace.stages.find(s => s.name === stageName);
        if (stageExec && stageExec.duration) {
          stageDurations.push(stageExec.duration);
        }
      }

      const profile: StagePerformanceProfile = {
        stageName,
        averageDuration: stageMetrics.averageDuration,
        minDuration: Math.min(...stageDurations, Infinity),
        maxDuration: Math.max(...stageDurations, -Infinity),
        successRate: stageMetrics.successRate,
        retryRate: stageMetrics.retries / Math.max(stageMetrics.executions, 1),
        percentOfTotalTime: (stageMetrics.averageDuration / totalTime) * 100,
      };

      stageProfiles.set(stageName, profile);
    }

    return {
      pipelineName,
      averageDuration: metrics.averageDuration,
      p50Duration: p50,
      p95Duration: p95,
      p99Duration: p99,
      successRate: metrics.successRate,
      throughput,
      stageProfiles,
    };
  }

  /**
   * Detect bottlenecks in pipeline
   */
  detectBottlenecks(pipelineName: string): BottleneckAnalysis | null {
    const profile = this.analyzePerformance(pipelineName);
    if (!profile) return null;

    // Find stages that take significant time
    const bottlenecks = Array.from(profile.stageProfiles.values())
      .filter(s => s.percentOfTotalTime > 20)
      .map(s => ({
        stageName: s.stageName,
        impact: s.percentOfTotalTime / 100,
        reason: s.percentOfTotalTime > 50
          ? 'Dominates execution time'
          : 'Significant contributor to execution time',
      }))
      .sort((a, b) => b.impact - a.impact);

    // Build critical path (stages in order of execution)
    const criticalPath = Array.from(profile.stageProfiles.keys());

    // Find parallelization opportunities
    // (This is simplified - in reality would need dependency analysis)
    const parallelizationOpportunities: Array<{
      stages: string[];
      potentialSpeedup: number;
    }> = [];

    const independentStages = Array.from(profile.stageProfiles.values())
      .filter(s => s.percentOfTotalTime > 10 && s.percentOfTotalTime < 30);

    if (independentStages.length >= 2) {
      parallelizationOpportunities.push({
        stages: independentStages.map(s => s.stageName),
        potentialSpeedup: independentStages.reduce(
          (sum, s) => sum + s.averageDuration,
          0
        ) / Math.max(...independentStages.map(s => s.averageDuration)),
      });
    }

    return {
      criticalPath,
      bottlenecks,
      parallelizationOpportunities,
    };
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(pipelineName: string): OptimizationRecommendation[] {
    const profile = this.analyzePerformance(pipelineName);
    const bottlenecks = this.detectBottlenecks(pipelineName);
    const recommendations: OptimizationRecommendation[] = [];

    if (!profile || !bottlenecks) return recommendations;

    // Recommend caching for slow stages
    for (const [stageName, stageProfile] of profile.stageProfiles.entries()) {
      if (stageProfile.averageDuration > 5000) {
        recommendations.push({
          type: 'caching',
          priority: 'high',
          target: stageName,
          recommendation: `Enable caching for ${stageName} (avg: ${stageProfile.averageDuration}ms)`,
          expectedImprovement: 'Up to 100% reduction in repeated executions',
        });
      }
    }

    // Recommend parallelization
    for (const opp of bottlenecks.parallelizationOpportunities) {
      if (opp.potentialSpeedup > 1.5) {
        recommendations.push({
          type: 'parallelization',
          priority: 'high',
          target: opp.stages.join(', '),
          recommendation: `Parallelize stages: ${opp.stages.join(', ')}`,
          expectedImprovement: `${((opp.potentialSpeedup - 1) * 100).toFixed(0)}% faster`,
        });
      }
    }

    // Recommend retry adjustments
    for (const [stageName, stageProfile] of profile.stageProfiles.entries()) {
      if (stageProfile.retryRate > 0.3) {
        recommendations.push({
          type: 'retry',
          priority: 'medium',
          target: stageName,
          recommendation: `High retry rate (${(stageProfile.retryRate * 100).toFixed(0)}%) for ${stageName}. Consider increasing timeout or improving reliability.`,
          expectedImprovement: 'Reduced retry overhead',
        });
      }
    }

    // Recommend timeout adjustments
    for (const [stageName, stageProfile] of profile.stageProfiles.entries()) {
      const variance = stageProfile.maxDuration - stageProfile.minDuration;
      if (variance > stageProfile.averageDuration * 2) {
        recommendations.push({
          type: 'timeout',
          priority: 'low',
          target: stageName,
          recommendation: `High variance in ${stageName} execution time. Consider dynamic timeout based on input.`,
          expectedImprovement: 'Better timeout handling',
        });
      }
    }

    // Recommend removing unnecessary stages
    for (const [stageName, stageProfile] of profile.stageProfiles.entries()) {
      if (stageProfile.successRate < 0.5) {
        recommendations.push({
          type: 'removal',
          priority: 'high',
          target: stageName,
          recommendation: `Stage ${stageName} has low success rate (${(stageProfile.successRate * 100).toFixed(0)}%). Consider removing or fixing.`,
          expectedImprovement: 'Improved overall success rate',
        });
      }
    }

    this.recommendations.set(pipelineName, recommendations);
    return recommendations;
  }

  /**
   * Auto-tune pipeline parameters
   */
  autoTune(pipelineName: string): {
    appliedOptimizations: string[];
    rejectedOptimizations: string[];
    estimatedImprovement: number;
  } {
    const recommendations = this.generateRecommendations(pipelineName);
    const applied: string[] = [];
    const rejected: string[] = [];

    for (const rec of recommendations) {
      if (rec.autoApply) {
        // Apply optimization (simplified - would need actual pipeline modification)
        applied.push(rec.recommendation);
      } else {
        rejected.push(rec.recommendation);
      }
    }

    // Estimate improvement (simplified)
    const estimatedImprovement = applied.length * 0.15; // 15% per optimization

    return {
      appliedOptimizations: applied,
      rejectedOptimizations: rejected,
      estimatedImprovement,
    };
  }

  /**
   * Calculate optimal stage ordering
   */
  optimizeStageOrder(pipelineName: string): string[] {
    const profile = this.analyzePerformance(pipelineName);
    if (!profile) return [];

    // Simple heuristic: fast stages first, slow stages later
    // (In reality, would need dependency analysis)
    const stages = Array.from(profile.stageProfiles.values())
      .sort((a, b) => a.averageDuration - b.averageDuration)
      .map(s => s.stageName);

    return stages;
  }

  /**
   * Predict pipeline duration
   */
  predictDuration(pipelineName: string): {
    predicted: number;
    confidence: number;
    range: [number, number];
  } {
    const profile = this.analyzePerformance(pipelineName);
    if (!profile) {
      return {
        predicted: 0,
        confidence: 0,
        range: [0, 0],
      };
    }

    // Use p50 as prediction
    const predicted = profile.p50Duration;

    // Confidence based on variance
    const variance = profile.p99Duration - profile.p50Duration;
    const confidence = Math.max(0, Math.min(1, 1 - (variance / predicted)));

    // Range based on p95 and p99
    const range: [number, number] = [
      profile.p50Duration * 0.8,
      profile.p95Duration,
    ];

    return {
      predicted,
      confidence,
      range,
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }
}

/**
 * Resource usage tracker
 */
export class ResourceTracker {
  private cpuUsage: number[] = [];
  private memoryUsage: number[] = [];
  private tracking = false;
  private interval: NodeJS.Timeout | null = null;

  /**
   * Start tracking resource usage
   */
  start(intervalMs: number = 1000): void {
    if (this.tracking) return;

    this.tracking = true;
    this.cpuUsage = [];
    this.memoryUsage = [];

    this.interval = setInterval(() => {
      const usage = process.cpuUsage();
      const memory = process.memoryUsage();

      this.cpuUsage.push((usage.user + usage.system) / 1000000); // Convert to seconds
      this.memoryUsage.push(memory.heapUsed / 1024 / 1024); // Convert to MB
    }, intervalMs);
  }

  /**
   * Stop tracking
   */
  stop(): void {
    this.tracking = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Get resource statistics
   */
  getStats(): {
    cpu: {
      avg: number;
      min: number;
      max: number;
      total: number;
    };
    memory: {
      avg: number;
      min: number;
      max: number;
      peak: number;
    };
  } {
    return {
      cpu: {
        avg: this.average(this.cpuUsage),
        min: Math.min(...this.cpuUsage),
        max: Math.max(...this.cpuUsage),
        total: this.sum(this.cpuUsage),
      },
      memory: {
        avg: this.average(this.memoryUsage),
        min: Math.min(...this.memoryUsage),
        max: Math.max(...this.memoryUsage),
        peak: Math.max(...this.memoryUsage),
      },
    };
  }

  /**
   * Reset tracking data
   */
  reset(): void {
    this.cpuUsage = [];
    this.memoryUsage = [];
  }

  private average(arr: number[]): number {
    return arr.length > 0 ? this.sum(arr) / arr.length : 0;
  }

  private sum(arr: number[]): number {
    return arr.reduce((sum, val) => sum + val, 0);
  }
}

/**
 * Performance budget enforcer
 */
export class PerformanceBudget {
  private budgets = new Map<string, {
    maxDuration: number;
    maxMemory?: number;
    maxCpu?: number;
  }>();

  /**
   * Set performance budget for a pipeline
   */
  setBudget(
    pipelineName: string,
    budget: {
      maxDuration: number;
      maxMemory?: number;
      maxCpu?: number;
    }
  ): void {
    this.budgets.set(pipelineName, budget);
  }

  /**
   * Check if execution is within budget
   */
  checkBudget(
    pipelineName: string,
    result: PipelineResult,
    resourceStats?: {
      cpu: { total: number };
      memory: { peak: number };
    }
  ): {
    withinBudget: boolean;
    violations: string[];
  } {
    const budget = this.budgets.get(pipelineName);
    if (!budget) {
      return { withinBudget: true, violations: [] };
    }

    const violations: string[] = [];

    // Check duration
    if (result.metrics.totalDuration > budget.maxDuration) {
      violations.push(
        `Duration exceeded: ${result.metrics.totalDuration}ms > ${budget.maxDuration}ms`
      );
    }

    // Check memory
    if (budget.maxMemory && resourceStats?.memory) {
      if (resourceStats.memory.peak > budget.maxMemory) {
        violations.push(
          `Memory exceeded: ${resourceStats.memory.peak}MB > ${budget.maxMemory}MB`
        );
      }
    }

    // Check CPU
    if (budget.maxCpu && resourceStats?.cpu) {
      if (resourceStats.cpu.total > budget.maxCpu) {
        violations.push(
          `CPU exceeded: ${resourceStats.cpu.total}s > ${budget.maxCpu}s`
        );
      }
    }

    return {
      withinBudget: violations.length === 0,
      violations,
    };
  }

  /**
   * Get budget for pipeline
   */
  getBudget(pipelineName: string) {
    return this.budgets.get(pipelineName);
  }
}
