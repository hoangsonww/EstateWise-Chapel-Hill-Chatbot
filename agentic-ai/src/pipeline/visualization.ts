/**
 * Pipeline Visualization and DAG
 *
 * Create visual representations of pipelines, DAG graphs, execution flows,
 * and interactive dashboards for monitoring.
 */

import type { Pipeline, PipelineStage, PipelineResult } from './types.js';
import type { ExecutionTrace } from './monitoring.js';

/**
 * DAG node representing a stage
 */
export interface DAGNode {
  id: string;
  label: string;
  type: 'stage' | 'start' | 'end' | 'conditional' | 'parallel';
  metadata?: Record<string, unknown>;
  stats?: {
    averageDuration: number;
    successRate: number;
    executionCount: number;
  };
}

/**
 * DAG edge representing stage dependency
 */
export interface DAGEdge {
  from: string;
  to: string;
  label?: string;
  condition?: string;
}

/**
 * DAG graph representation
 */
export interface DAGGraph {
  nodes: DAGNode[];
  edges: DAGEdge[];
  metadata?: {
    pipelineName: string;
    created: number;
    version?: string;
  };
}

/**
 * Pipeline DAG builder
 */
export class PipelineDAGBuilder {
  /**
   * Build DAG from pipeline
   */
  static buildDAG(pipeline: Pipeline): DAGGraph {
    const nodes: DAGNode[] = [];
    const edges: DAGEdge[] = [];

    // Start node
    nodes.push({
      id: 'start',
      label: 'Start',
      type: 'start',
    });

    // Add stage nodes
    let previousNodeId = 'start';
    for (const stage of pipeline.stages) {
      nodes.push({
        id: stage.name,
        label: stage.description || stage.name,
        type: 'stage',
        metadata: {
          retryable: stage.retryable,
          maxRetries: stage.maxRetries,
          timeout: stage.timeout,
        },
      });

      // Add edge from previous node
      edges.push({
        from: previousNodeId,
        to: stage.name,
      });

      previousNodeId = stage.name;
    }

    // End node
    nodes.push({
      id: 'end',
      label: 'End',
      type: 'end',
    });

    edges.push({
      from: previousNodeId,
      to: 'end',
    });

    return {
      nodes,
      edges,
      metadata: {
        pipelineName: pipeline.options.name,
        created: Date.now(),
      },
    };
  }

  /**
   * Export DAG to Mermaid format
   */
  static toMermaid(dag: DAGGraph): string {
    const lines: string[] = [];

    lines.push('graph TD');

    // Add nodes
    for (const node of dag.nodes) {
      const shape = this.getMermaidShape(node.type);
      lines.push(`  ${node.id}${shape[0]}${node.label}${shape[1]}`);
    }

    // Add edges
    for (const edge of dag.edges) {
      const label = edge.label ? `|${edge.label}|` : '';
      lines.push(`  ${edge.from} -->${label} ${edge.to}`);
    }

    return lines.join('\n');
  }

  /**
   * Export DAG to Graphviz DOT format
   */
  static toDOT(dag: DAGGraph): string {
    const lines: string[] = [];

    lines.push('digraph Pipeline {');
    lines.push('  rankdir=TB;');
    lines.push('  node [shape=box, style=rounded];');

    // Add nodes
    for (const node of dag.nodes) {
      const attrs = this.getDOTNodeAttributes(node);
      lines.push(`  ${node.id} [label="${node.label}"${attrs}];`);
    }

    // Add edges
    for (const edge of dag.edges) {
      const label = edge.label ? `, label="${edge.label}"` : '';
      lines.push(`  ${edge.from} -> ${edge.to}${label};`);
    }

    lines.push('}');

    return lines.join('\n');
  }

  /**
   * Export DAG to JSON
   */
  static toJSON(dag: DAGGraph): string {
    return JSON.stringify(dag, null, 2);
  }

  private static getMermaidShape(type: string): [string, string] {
    switch (type) {
      case 'start':
      case 'end':
        return ['([', '])'];
      case 'conditional':
        return ['{', '}'];
      case 'parallel':
        return ['[[', ']]'];
      default:
        return ['[', ']'];
    }
  }

  private static getDOTNodeAttributes(node: DAGNode): string {
    const attrs: string[] = [];

    switch (node.type) {
      case 'start':
      case 'end':
        attrs.push('shape=circle');
        attrs.push('style=filled');
        attrs.push('fillcolor=lightgreen');
        break;
      case 'conditional':
        attrs.push('shape=diamond');
        break;
      case 'parallel':
        attrs.push('shape=parallelogram');
        break;
    }

    return attrs.length > 0 ? ', ' + attrs.join(', ') : '';
  }
}

/**
 * Execution timeline visualizer
 */
export class TimelineVisualizer {
  /**
   * Create ASCII timeline
   */
  static createTimeline(trace: ExecutionTrace): string {
    const lines: string[] = [];

    lines.push('\n╔══════════════════════════════════════════════════════════════╗');
    lines.push(`║ Pipeline: ${trace.pipelineName.padEnd(49)} ║`);
    lines.push(`║ Execution ID: ${trace.executionId.substring(0, 45).padEnd(45)} ║`);
    lines.push(`║ Duration: ${String(trace.duration || 0) + 'ms'.padEnd(49)} ║`);
    lines.push('╠══════════════════════════════════════════════════════════════╣');

    if (trace.stages.length === 0) {
      lines.push('║ No stages executed                                          ║');
    } else {
      const totalDuration = trace.duration || 1;

      for (const stage of trace.stages) {
        const duration = stage.duration || 0;
        const percentage = (duration / totalDuration) * 100;
        const barLength = Math.round((percentage / 100) * 40);
        const bar = '█'.repeat(barLength).padEnd(40);
        const status = stage.success ? '✓' : '✗';

        lines.push('║──────────────────────────────────────────────────────────────║');
        lines.push(`║ ${status} ${stage.name.padEnd(56)} ║`);
        lines.push(`║   [${bar}] ${percentage.toFixed(1)}%  ║`);
        lines.push(`║   Duration: ${String(duration) + 'ms'.padEnd(48)} ║`);

        if (stage.attempts && stage.attempts > 1) {
          lines.push(`║   Attempts: ${String(stage.attempts).padEnd(48)} ║`);
        }
      }
    }

    lines.push('╚══════════════════════════════════════════════════════════════╝\n');

    return lines.join('\n');
  }

  /**
   * Create Gantt chart data
   */
  static createGanttData(trace: ExecutionTrace): Array<{
    name: string;
    start: number;
    end: number;
    duration: number;
  }> {
    return trace.stages.map((stage, index) => ({
      name: stage.name,
      start: stage.startTime - trace.startTime,
      end: (stage.endTime || stage.startTime) - trace.startTime,
      duration: stage.duration || 0,
    }));
  }
}

/**
 * Performance dashboard data
 */
export interface DashboardData {
  overview: {
    totalExecutions: number;
    successRate: number;
    averageDuration: number;
    throughput: number;
  };
  recentExecutions: Array<{
    id: string;
    timestamp: number;
    duration: number;
    success: boolean;
  }>;
  stagePerformance: Array<{
    name: string;
    averageDuration: number;
    successRate: number;
    percentOfTotal: number;
  }>;
  trends: {
    durationTrend: Array<{ timestamp: number; value: number }>;
    successRateTrend: Array<{ timestamp: number; value: number }>;
  };
}

/**
 * Dashboard generator
 */
export class DashboardGenerator {
  /**
   * Generate dashboard data from traces
   */
  static generateDashboard(
    pipelineName: string,
    traces: ExecutionTrace[]
  ): DashboardData {
    if (traces.length === 0) {
      return this.emptyDashboard();
    }

    // Overview
    const successCount = traces.filter(t => t.success).length;
    const totalDuration = traces.reduce((sum, t) => sum + (t.duration || 0), 0);
    const timespan = Math.max(...traces.map(t => t.endTime || 0)) -
      Math.min(...traces.map(t => t.startTime));

    const overview = {
      totalExecutions: traces.length,
      successRate: successCount / traces.length,
      averageDuration: totalDuration / traces.length,
      throughput: timespan > 0 ? (traces.length / timespan) * 60000 : 0, // per minute
    };

    // Recent executions
    const recentExecutions = traces
      .slice(-10)
      .map(t => ({
        id: t.executionId,
        timestamp: t.startTime,
        duration: t.duration || 0,
        success: t.success || false,
      }));

    // Stage performance
    const stageStats = new Map<string, {
      totalDuration: number;
      executions: number;
      successes: number;
    }>();

    for (const trace of traces) {
      for (const stage of trace.stages) {
        if (!stageStats.has(stage.name)) {
          stageStats.set(stage.name, {
            totalDuration: 0,
            executions: 0,
            successes: 0,
          });
        }

        const stats = stageStats.get(stage.name)!;
        stats.totalDuration += stage.duration || 0;
        stats.executions++;
        if (stage.success) stats.successes++;
      }
    }

    const stagePerformance = Array.from(stageStats.entries()).map(([name, stats]) => ({
      name,
      averageDuration: stats.totalDuration / stats.executions,
      successRate: stats.successes / stats.executions,
      percentOfTotal: (stats.totalDuration / totalDuration) * 100,
    }));

    // Trends (last 20 executions)
    const recentTraces = traces.slice(-20);
    const durationTrend = recentTraces.map(t => ({
      timestamp: t.startTime,
      value: t.duration || 0,
    }));

    const successRateTrend: Array<{ timestamp: number; value: number }> = [];
    for (let i = 0; i < recentTraces.length; i++) {
      const window = recentTraces.slice(Math.max(0, i - 4), i + 1);
      const windowSuccessRate = window.filter(t => t.success).length / window.length;
      successRateTrend.push({
        timestamp: recentTraces[i].startTime,
        value: windowSuccessRate,
      });
    }

    return {
      overview,
      recentExecutions,
      stagePerformance,
      trends: {
        durationTrend,
        successRateTrend,
      },
    };
  }

  /**
   * Generate ASCII dashboard
   */
  static generateASCIIDashboard(data: DashboardData, pipelineName: string): string {
    const lines: string[] = [];

    lines.push('\n╔════════════════════════════════════════════════════════════════════╗');
    lines.push(`║ Pipeline Dashboard: ${pipelineName.padEnd(44)} ║`);
    lines.push('╠════════════════════════════════════════════════════════════════════╣');

    // Overview
    lines.push('║ OVERVIEW                                                           ║');
    lines.push('║────────────────────────────────────────────────────────────────────║');
    lines.push(`║ Total Executions:    ${String(data.overview.totalExecutions).padEnd(44)} ║`);
    lines.push(`║ Success Rate:        ${(data.overview.successRate * 100).toFixed(1) + '%'.padEnd(44)} ║`);
    lines.push(`║ Average Duration:    ${data.overview.averageDuration.toFixed(0) + 'ms'.padEnd(44)} ║`);
    lines.push(`║ Throughput:          ${data.overview.throughput.toFixed(2) + ' exec/min'.padEnd(44)} ║`);

    // Top stages
    lines.push('╠════════════════════════════════════════════════════════════════════╣');
    lines.push('║ TOP STAGES BY DURATION                                             ║');
    lines.push('║────────────────────────────────────────────────────────────────────║');

    const topStages = data.stagePerformance
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 5);

    for (const stage of topStages) {
      const name = stage.name.substring(0, 20).padEnd(20);
      const duration = String(stage.averageDuration.toFixed(0)) + 'ms';
      const percent = stage.percentOfTotal.toFixed(1) + '%';
      lines.push(`║ ${name} ${duration.padStart(10)} (${percent.padStart(6)})     ║`);
    }

    // Recent executions
    lines.push('╠════════════════════════════════════════════════════════════════════╣');
    lines.push('║ RECENT EXECUTIONS                                                  ║');
    lines.push('║────────────────────────────────────────────────────────────────────║');

    for (const exec of data.recentExecutions.slice(-5)) {
      const status = exec.success ? '✓' : '✗';
      const duration = String(exec.duration) + 'ms';
      const time = new Date(exec.timestamp).toLocaleTimeString();
      lines.push(`║ ${status} ${time.padEnd(15)} ${duration.padStart(10)}                        ║`);
    }

    lines.push('╚════════════════════════════════════════════════════════════════════╝\n');

    return lines.join('\n');
  }

  /**
   * Export dashboard data to JSON
   */
  static exportJSON(data: DashboardData): string {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export dashboard data to CSV
   */
  static exportCSV(data: DashboardData): string {
    const lines: string[] = [];

    // Stage performance
    lines.push('Stage,Average Duration (ms),Success Rate (%),Percent of Total (%)');
    for (const stage of data.stagePerformance) {
      lines.push(
        `${stage.name},${stage.averageDuration.toFixed(2)},${(stage.successRate * 100).toFixed(2)},${stage.percentOfTotal.toFixed(2)}`
      );
    }

    return lines.join('\n');
  }

  private static emptyDashboard(): DashboardData {
    return {
      overview: {
        totalExecutions: 0,
        successRate: 0,
        averageDuration: 0,
        throughput: 0,
      },
      recentExecutions: [],
      stagePerformance: [],
      trends: {
        durationTrend: [],
        successRateTrend: [],
      },
    };
  }
}

/**
 * Flow diagram generator
 */
export class FlowDiagramGenerator {
  /**
   * Generate flowchart in text format
   */
  static generateFlowchart(dag: DAGGraph): string {
    const lines: string[] = [];
    const maxWidth = 60;

    lines.push('┌' + '─'.repeat(maxWidth) + '┐');
    lines.push('│' + dag.metadata?.pipelineName.padEnd(maxWidth) + '│');
    lines.push('├' + '─'.repeat(maxWidth) + '┤');

    for (let i = 0; i < dag.nodes.length; i++) {
      const node = dag.nodes[i];

      if (node.type === 'start' || node.type === 'end') {
        const centered = node.label.padStart((maxWidth + node.label.length) / 2);
        lines.push('│' + centered.padEnd(maxWidth) + '│');
      } else {
        const box = `┌─ ${node.label} ─┐`;
        const centered = box.padStart((maxWidth + box.length) / 2);
        lines.push('│' + centered.padEnd(maxWidth) + '│');
      }

      if (i < dag.nodes.length - 1) {
        const arrow = '↓';
        const centered = arrow.padStart(maxWidth / 2);
        lines.push('│' + centered.padEnd(maxWidth) + '│');
      }
    }

    lines.push('└' + '─'.repeat(maxWidth) + '┘');

    return lines.join('\n');
  }
}
