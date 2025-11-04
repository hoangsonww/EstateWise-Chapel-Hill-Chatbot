/**
 * Advanced Pipeline Scheduling
 *
 * Cron-like scheduling, pipeline dependencies, priority queues,
 * delayed execution, and recurring pipeline runs.
 */

import { EventEmitter } from 'events';
import type { Pipeline, PipelineResult } from './types.js';

/**
 * Schedule configuration
 */
export interface ScheduleConfig {
  id: string;
  pipeline: Pipeline;
  schedule: string | CronExpression;
  input?: unknown;
  enabled: boolean;
  priority?: number;
  metadata?: Record<string, unknown>;
  dependencies?: string[]; // IDs of pipelines that must complete first
  retryOnFailure?: boolean;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Cron expression parser
 */
export interface CronExpression {
  minute?: number | string; // 0-59 or *
  hour?: number | string; // 0-23 or *
  dayOfMonth?: number | string; // 1-31 or *
  month?: number | string; // 1-12 or *
  dayOfWeek?: number | string; // 0-6 or *
}

/**
 * Scheduled execution record
 */
export interface ScheduledExecution {
  id: string;
  scheduleId: string;
  scheduledTime: number;
  executionTime?: number;
  completionTime?: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: PipelineResult;
  error?: Error;
  attempt: number;
}

/**
 * Pipeline dependency graph
 */
export class DependencyGraph {
  private dependencies = new Map<string, Set<string>>();
  private dependents = new Map<string, Set<string>>();

  /**
   * Add a dependency: pipelineId depends on dependencyId
   */
  addDependency(pipelineId: string, dependencyId: string): void {
    if (!this.dependencies.has(pipelineId)) {
      this.dependencies.set(pipelineId, new Set());
    }
    this.dependencies.get(pipelineId)!.add(dependencyId);

    if (!this.dependents.has(dependencyId)) {
      this.dependents.set(dependencyId, new Set());
    }
    this.dependents.get(dependencyId)!.add(pipelineId);
  }

  /**
   * Remove a dependency
   */
  removeDependency(pipelineId: string, dependencyId: string): void {
    this.dependencies.get(pipelineId)?.delete(dependencyId);
    this.dependents.get(dependencyId)?.delete(pipelineId);
  }

  /**
   * Get all dependencies for a pipeline
   */
  getDependencies(pipelineId: string): string[] {
    return Array.from(this.dependencies.get(pipelineId) || []);
  }

  /**
   * Get all dependents of a pipeline
   */
  getDependents(pipelineId: string): string[] {
    return Array.from(this.dependents.get(pipelineId) || []);
  }

  /**
   * Check if there are circular dependencies
   */
  hasCircularDependency(pipelineId: string): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (id: string): boolean => {
      visited.add(id);
      recursionStack.add(id);

      const deps = this.getDependencies(id);
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true;
        }
      }

      recursionStack.delete(id);
      return false;
    };

    return hasCycle(pipelineId);
  }

  /**
   * Get execution order (topological sort)
   */
  getExecutionOrder(pipelineIds: string[]): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const deps = this.getDependencies(id);
      for (const dep of deps) {
        if (pipelineIds.includes(dep)) {
          visit(dep);
        }
      }

      order.push(id);
    };

    for (const id of pipelineIds) {
      visit(id);
    }

    return order;
  }
}

/**
 * Cron parser and matcher
 */
export class CronParser {
  /**
   * Parse cron string (simplified)
   */
  static parse(cronString: string): CronExpression {
    const parts = cronString.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression. Expected 5 parts: minute hour day month weekday');
    }

    return {
      minute: parts[0],
      hour: parts[1],
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4],
    };
  }

  /**
   * Check if current time matches cron expression
   */
  static matches(cron: CronExpression, date: Date = new Date()): boolean {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const dayOfMonth = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    return (
      this.matchField(cron.minute, minute) &&
      this.matchField(cron.hour, hour) &&
      this.matchField(cron.dayOfMonth, dayOfMonth) &&
      this.matchField(cron.month, month) &&
      this.matchField(cron.dayOfWeek, dayOfWeek)
    );
  }

  /**
   * Get next execution time
   */
  static getNextExecution(cron: CronExpression, after: Date = new Date()): Date {
    const next = new Date(after);
    next.setSeconds(0);
    next.setMilliseconds(0);

    // Try up to 366 days (1 year + 1 day for leap years)
    for (let i = 0; i < 366 * 24 * 60; i++) {
      next.setMinutes(next.getMinutes() + 1);
      if (this.matches(cron, next)) {
        return next;
      }
    }

    throw new Error('Could not find next execution time within 1 year');
  }

  private static matchField(field: number | string | undefined, value: number): boolean {
    if (field === undefined || field === '*') return true;
    if (typeof field === 'number') return field === value;

    // Handle ranges (e.g., "1-5")
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      return value >= start && value <= end;
    }

    // Handle lists (e.g., "1,3,5")
    if (field.includes(',')) {
      return field.split(',').map(Number).includes(value);
    }

    // Handle step values (e.g., "*/5")
    if (field.includes('/')) {
      const [, step] = field.split('/').map(Number);
      return value % step === 0;
    }

    return Number(field) === value;
  }
}

/**
 * Pipeline scheduler
 */
export class PipelineScheduler extends EventEmitter {
  private schedules = new Map<string, ScheduleConfig>();
  private executions = new Map<string, ScheduledExecution>();
  private dependencyGraph = new DependencyGraph();
  private running = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private completedPipelines = new Set<string>();

  constructor(private options?: {
    checkIntervalMs?: number;
  }) {
    super();
  }

  /**
   * Add a scheduled pipeline
   */
  addSchedule(config: ScheduleConfig): void {
    // Validate
    if (this.schedules.has(config.id)) {
      throw new Error(`Schedule ${config.id} already exists`);
    }

    // Parse cron if string
    if (typeof config.schedule === 'string') {
      try {
        config.schedule = CronParser.parse(config.schedule);
      } catch (error) {
        throw new Error(`Invalid cron expression: ${config.schedule}`);
      }
    }

    // Add dependencies to graph
    if (config.dependencies) {
      for (const depId of config.dependencies) {
        this.dependencyGraph.addDependency(config.id, depId);
      }

      // Check for circular dependencies
      if (this.dependencyGraph.hasCircularDependency(config.id)) {
        throw new Error(`Circular dependency detected for ${config.id}`);
      }
    }

    this.schedules.set(config.id, config);
    this.emit('schedule-added', config);
  }

  /**
   * Remove a schedule
   */
  removeSchedule(scheduleId: string): void {
    const config = this.schedules.get(scheduleId);
    if (config) {
      this.schedules.delete(scheduleId);
      this.emit('schedule-removed', scheduleId);
    }
  }

  /**
   * Update a schedule
   */
  updateSchedule(scheduleId: string, updates: Partial<ScheduleConfig>): void {
    const config = this.schedules.get(scheduleId);
    if (!config) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    Object.assign(config, updates);
    this.emit('schedule-updated', scheduleId);
  }

  /**
   * Enable/disable a schedule
   */
  setScheduleEnabled(scheduleId: string, enabled: boolean): void {
    this.updateSchedule(scheduleId, { enabled });
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    const interval = this.options?.checkIntervalMs || 60000; // 1 minute

    this.checkInterval = setInterval(() => {
      this.checkSchedules();
    }, interval);

    this.emit('started');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    this.running = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.emit('stopped');
  }

  /**
   * Check all schedules and execute if needed
   */
  private async checkSchedules(): Promise<void> {
    const now = new Date();

    for (const [id, config] of this.schedules.entries()) {
      if (!config.enabled) continue;

      const cron = config.schedule as CronExpression;
      if (CronParser.matches(cron, now)) {
        await this.executeSchedule(id);
      }
    }
  }

  /**
   * Execute a scheduled pipeline
   */
  async executeSchedule(scheduleId: string, force = false): Promise<ScheduledExecution> {
    const config = this.schedules.get(scheduleId);
    if (!config) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    if (!force && !config.enabled) {
      throw new Error(`Schedule ${scheduleId} is disabled`);
    }

    // Check dependencies
    if (config.dependencies && config.dependencies.length > 0) {
      for (const depId of config.dependencies) {
        if (!this.completedPipelines.has(depId)) {
          throw new Error(`Dependency ${depId} not completed for ${scheduleId}`);
        }
      }
    }

    const execution: ScheduledExecution = {
      id: `exec-${scheduleId}-${Date.now()}`,
      scheduleId,
      scheduledTime: Date.now(),
      status: 'pending',
      attempt: 0,
    };

    this.executions.set(execution.id, execution);
    this.emit('execution-scheduled', execution);

    // Execute with retries
    const maxRetries = config.maxRetries || 0;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      execution.attempt = attempt + 1;
      execution.status = 'running';
      execution.executionTime = Date.now();

      try {
        this.emit('execution-started', execution);

        const result = await this.executeWithTimeout(
          config.pipeline,
          config.input,
          config.timeout
        );

        execution.status = 'completed';
        execution.completionTime = Date.now();
        execution.result = result;

        this.completedPipelines.add(scheduleId);
        this.emit('execution-completed', execution);

        return execution;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        execution.error = lastError;

        if (attempt < maxRetries && config.retryOnFailure) {
          this.emit('execution-retry', { execution, attempt: attempt + 1 });
          await this.delay(Math.min(1000 * Math.pow(2, attempt), 30000)); // Exponential backoff
        }
      }
    }

    // All retries failed
    execution.status = 'failed';
    execution.completionTime = Date.now();
    this.emit('execution-failed', execution);

    throw lastError!;
  }

  /**
   * Execute pipeline with timeout
   */
  private async executeWithTimeout(
    pipeline: Pipeline,
    input: unknown,
    timeout?: number
  ): Promise<PipelineResult> {
    if (!timeout) {
      return pipeline.execute(input);
    }

    return Promise.race([
      pipeline.execute(input),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Pipeline execution timeout')), timeout)
      ),
    ]);
  }

  /**
   * Get schedule by ID
   */
  getSchedule(scheduleId: string): ScheduleConfig | undefined {
    return this.schedules.get(scheduleId);
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): ScheduleConfig[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): ScheduledExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get executions for a schedule
   */
  getExecutionsForSchedule(scheduleId: string): ScheduledExecution[] {
    return Array.from(this.executions.values()).filter(
      e => e.scheduleId === scheduleId
    );
  }

  /**
   * Get next execution time for a schedule
   */
  getNextExecutionTime(scheduleId: string): Date | null {
    const config = this.schedules.get(scheduleId);
    if (!config || !config.enabled) return null;

    try {
      return CronParser.getNextExecution(config.schedule as CronExpression);
    } catch {
      return null;
    }
  }

  /**
   * Clear completed executions
   */
  clearExecutions(olderThan?: number): number {
    const cutoff = olderThan || Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    let cleared = 0;

    for (const [id, exec] of this.executions.entries()) {
      if (exec.completionTime && exec.completionTime < cutoff) {
        this.executions.delete(id);
        cleared++;
      }
    }

    return cleared;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Delayed pipeline executor
 */
export class DelayedExecutor {
  private timers = new Map<string, NodeJS.Timeout>();

  /**
   * Schedule a pipeline to run after a delay
   */
  scheduleDelayed(
    id: string,
    pipeline: Pipeline,
    input: unknown,
    delayMs: number,
    callback?: (result: PipelineResult) => void
  ): void {
    // Clear existing timer if any
    this.cancel(id);

    const timer = setTimeout(async () => {
      try {
        const result = await pipeline.execute(input);
        if (callback) callback(result);
      } catch (error) {
        console.error('Delayed execution failed:', error);
      } finally {
        this.timers.delete(id);
      }
    }, delayMs);

    this.timers.set(id, timer);
  }

  /**
   * Cancel a delayed execution
   */
  cancel(id: string): boolean {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
      return true;
    }
    return false;
  }

  /**
   * Cancel all delayed executions
   */
  cancelAll(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}

/**
 * Recurring pipeline executor
 */
export class RecurringExecutor extends EventEmitter {
  private intervals = new Map<string, NodeJS.Timeout>();

  /**
   * Schedule a pipeline to run repeatedly
   */
  scheduleRecurring(
    id: string,
    pipeline: Pipeline,
    input: unknown,
    intervalMs: number,
    options?: {
      maxExecutions?: number;
      onExecution?: (result: PipelineResult, count: number) => void;
      onError?: (error: Error, count: number) => void;
    }
  ): void {
    // Clear existing interval if any
    this.cancel(id);

    let count = 0;
    const maxExecutions = options?.maxExecutions || Infinity;

    const execute = async () => {
      if (count >= maxExecutions) {
        this.cancel(id);
        this.emit('completed', { id, totalExecutions: count });
        return;
      }

      count++;

      try {
        this.emit('execution-start', { id, count });
        const result = await pipeline.execute(input);
        if (options?.onExecution) {
          options.onExecution(result, count);
        }
        this.emit('execution-complete', { id, count, result });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (options?.onError) {
          options.onError(err, count);
        }
        this.emit('execution-error', { id, count, error: err });
      }
    };

    const timer = setInterval(execute, intervalMs);
    this.intervals.set(id, timer);

    this.emit('scheduled', { id, intervalMs, maxExecutions });
  }

  /**
   * Cancel a recurring execution
   */
  cancel(id: string): boolean {
    const timer = this.intervals.get(id);
    if (timer) {
      clearInterval(timer);
      this.intervals.delete(id);
      this.emit('cancelled', { id });
      return true;
    }
    return false;
  }

  /**
   * Cancel all recurring executions
   */
  cancelAll(): void {
    for (const [id, timer] of this.intervals.entries()) {
      clearInterval(timer);
      this.emit('cancelled', { id });
    }
    this.intervals.clear();
  }

  /**
   * Get active recurring executions
   */
  getActive(): string[] {
    return Array.from(this.intervals.keys());
  }
}
