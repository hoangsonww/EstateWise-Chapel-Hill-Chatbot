/**
 * Distributed Pipeline Execution
 *
 * Worker pools, message queues, distributed stage execution,
 * and load balancing for scalable pipeline processing.
 */

import { EventEmitter } from 'events';
import type { PipelineStage, PipelineContext, StageResult } from './types.js';

/**
 * Work item for distributed execution
 */
export interface WorkItem {
  id: string;
  stageId: string;
  stageName: string;
  context: PipelineContext;
  priority: number;
  timestamp: number;
  attempts: number;
  maxAttempts: number;
}

/**
 * Worker status
 */
export interface WorkerStatus {
  id: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  tasksCompleted: number;
  tasksFailed: number;
  lastHeartbeat: number;
  capabilities: string[];
  load: number; // 0-1
}

/**
 * Message queue interface
 */
export interface MessageQueue {
  enqueue(item: WorkItem): Promise<void>;
  dequeue(): Promise<WorkItem | null>;
  peek(): Promise<WorkItem | null>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

/**
 * In-memory message queue
 */
export class InMemoryQueue implements MessageQueue {
  private queue: WorkItem[] = [];

  async enqueue(item: WorkItem): Promise<void> {
    this.queue.push(item);
    // Sort by priority (higher first) and timestamp
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
  }

  async dequeue(): Promise<WorkItem | null> {
    return this.queue.shift() || null;
  }

  async peek(): Promise<WorkItem | null> {
    return this.queue[0] || null;
  }

  async size(): Promise<number> {
    return this.queue.length;
  }

  async clear(): Promise<void> {
    this.queue = [];
  }

  getAll(): WorkItem[] {
    return [...this.queue];
  }
}

/**
 * Priority queue with multiple levels
 */
export class PriorityQueue implements MessageQueue {
  private queues = new Map<number, WorkItem[]>();
  private priorities = [10, 5, 1, 0]; // High to low

  async enqueue(item: WorkItem): Promise<void> {
    const priority = this.normalizePriority(item.priority);
    if (!this.queues.has(priority)) {
      this.queues.set(priority, []);
    }
    this.queues.get(priority)!.push(item);
  }

  async dequeue(): Promise<WorkItem | null> {
    // Dequeue from highest priority queue first
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }

  async peek(): Promise<WorkItem | null> {
    for (const priority of this.priorities) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue[0];
      }
    }
    return null;
  }

  async size(): Promise<number> {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  async clear(): Promise<void> {
    this.queues.clear();
  }

  private normalizePriority(priority: number): number {
    // Find closest priority level
    return this.priorities.reduce((prev, curr) =>
      Math.abs(curr - priority) < Math.abs(prev - priority) ? curr : prev
    );
  }
}

/**
 * Worker for distributed stage execution
 */
export class PipelineWorker extends EventEmitter {
  public readonly id: string;
  public status: WorkerStatus;
  private queue: MessageQueue;
  private stages = new Map<string, PipelineStage>();
  private currentTask: WorkItem | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(options: {
    id: string;
    queue: MessageQueue;
    capabilities?: string[];
    heartbeatInterval?: number;
  }) {
    super();
    this.id = options.id;
    this.queue = options.queue;
    this.status = {
      id: options.id,
      status: 'idle',
      tasksCompleted: 0,
      tasksFailed: 0,
      lastHeartbeat: Date.now(),
      capabilities: options.capabilities || [],
      load: 0,
    };

    // Start heartbeat
    const interval = options.heartbeatInterval || 5000;
    this.heartbeatInterval = setInterval(() => {
      this.status.lastHeartbeat = Date.now();
      this.emit('heartbeat', this.status);
    }, interval);
  }

  /**
   * Register a stage that this worker can execute
   */
  registerStage(stage: PipelineStage): void {
    this.stages.set(stage.name, stage);
    if (!this.status.capabilities.includes(stage.name)) {
      this.status.capabilities.push(stage.name);
    }
  }

  /**
   * Start processing work items
   */
  async start(): Promise<void> {
    if (this.status.status === 'offline') return;
    this.status.status = 'idle';
    this.emit('started');

    while (this.status.status !== 'offline') {
      try {
        await this.processNextItem();
        await this.delay(100); // Small delay between tasks
      } catch (error) {
        console.error('Worker error:', error);
        this.status.status = 'error';
        this.emit('error', error);
        await this.delay(5000); // Wait before retrying
        this.status.status = 'idle';
      }
    }
  }

  /**
   * Stop the worker
   */
  stop(): void {
    this.status.status = 'offline';
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.emit('stopped');
  }

  /**
   * Process the next work item from queue
   */
  private async processNextItem(): Promise<void> {
    const item = await this.queue.dequeue();
    if (!item) {
      this.status.status = 'idle';
      this.status.load = 0;
      return;
    }

    // Check if this worker can handle this stage
    if (!this.stages.has(item.stageName)) {
      // Put back in queue for another worker
      await this.queue.enqueue(item);
      return;
    }

    this.currentTask = item;
    this.status.status = 'busy';
    this.status.currentTask = item.id;
    this.status.load = 1;

    this.emit('task-start', item);

    try {
      const stage = this.stages.get(item.stageName)!;
      const startTime = Date.now();

      const result = await stage.execute(item.context);

      const duration = Date.now() - startTime;

      this.status.tasksCompleted++;
      this.emit('task-complete', {
        item,
        result,
        duration,
      });
    } catch (error) {
      this.status.tasksFailed++;
      item.attempts++;

      this.emit('task-error', {
        item,
        error,
      });

      // Retry if attempts remaining
      if (item.attempts < item.maxAttempts) {
        await this.queue.enqueue(item);
      }
    } finally {
      this.currentTask = null;
      this.status.status = 'idle';
      this.status.currentTask = undefined;
      this.status.load = 0;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Worker pool manager
 */
export class WorkerPool extends EventEmitter {
  private workers = new Map<string, PipelineWorker>();
  private queue: MessageQueue;
  private maxWorkers: number;

  constructor(options: {
    maxWorkers?: number;
    queue?: MessageQueue;
  }) {
    super();
    this.maxWorkers = options.maxWorkers || 4;
    this.queue = options.queue || new InMemoryQueue();
  }

  /**
   * Add a worker to the pool
   */
  addWorker(worker: PipelineWorker): void {
    if (this.workers.size >= this.maxWorkers) {
      throw new Error(`Worker pool at capacity (${this.maxWorkers})`);
    }

    this.workers.set(worker.id, worker);

    worker.on('task-complete', (data) => {
      this.emit('task-complete', { workerId: worker.id, ...data });
    });

    worker.on('task-error', (data) => {
      this.emit('task-error', { workerId: worker.id, ...data });
    });

    worker.on('heartbeat', (status) => {
      this.emit('worker-heartbeat', { workerId: worker.id, status });
    });

    this.emit('worker-added', worker.id);
  }

  /**
   * Remove a worker from the pool
   */
  removeWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.stop();
      this.workers.delete(workerId);
      this.emit('worker-removed', workerId);
    }
  }

  /**
   * Start all workers
   */
  async startAll(): Promise<void> {
    const promises = Array.from(this.workers.values()).map(w => w.start());
    await Promise.all(promises);
  }

  /**
   * Stop all workers
   */
  stopAll(): void {
    for (const worker of this.workers.values()) {
      worker.stop();
    }
  }

  /**
   * Submit work to the pool
   */
  async submitWork(item: WorkItem): Promise<void> {
    await this.queue.enqueue(item);
    this.emit('work-submitted', item);
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    totalWorkers: number;
    idleWorkers: number;
    busyWorkers: number;
    errorWorkers: number;
    queueSize: number;
    totalCompleted: number;
    totalFailed: number;
  } {
    let idleWorkers = 0;
    let busyWorkers = 0;
    let errorWorkers = 0;
    let totalCompleted = 0;
    let totalFailed = 0;

    for (const worker of this.workers.values()) {
      if (worker.status.status === 'idle') idleWorkers++;
      if (worker.status.status === 'busy') busyWorkers++;
      if (worker.status.status === 'error') errorWorkers++;
      totalCompleted += worker.status.tasksCompleted;
      totalFailed += worker.status.tasksFailed;
    }

    return {
      totalWorkers: this.workers.size,
      idleWorkers,
      busyWorkers,
      errorWorkers,
      queueSize: 0, // Will be updated async
      totalCompleted,
      totalFailed,
    };
  }

  /**
   * Get worker by ID
   */
  getWorker(workerId: string): PipelineWorker | undefined {
    return this.workers.get(workerId);
  }

  /**
   * Get all workers
   */
  getAllWorkers(): PipelineWorker[] {
    return Array.from(this.workers.values());
  }

  /**
   * Find least loaded worker
   */
  getLeastLoadedWorker(): PipelineWorker | null {
    let leastLoaded: PipelineWorker | null = null;
    let minLoad = Infinity;

    for (const worker of this.workers.values()) {
      if (worker.status.status === 'idle' && worker.status.load < minLoad) {
        leastLoaded = worker;
        minLoad = worker.status.load;
      }
    }

    return leastLoaded;
  }
}

/**
 * Load balancer for distributing work
 */
export class LoadBalancer {
  private strategy: 'round-robin' | 'least-loaded' | 'random';
  private roundRobinIndex = 0;

  constructor(strategy: 'round-robin' | 'least-loaded' | 'random' = 'least-loaded') {
    this.strategy = strategy;
  }

  /**
   * Select next worker based on strategy
   */
  selectWorker(workers: PipelineWorker[]): PipelineWorker | null {
    const availableWorkers = workers.filter(w => w.status.status === 'idle');

    if (availableWorkers.length === 0) {
      return null;
    }

    switch (this.strategy) {
      case 'round-robin':
        const worker = availableWorkers[this.roundRobinIndex % availableWorkers.length];
        this.roundRobinIndex++;
        return worker;

      case 'least-loaded':
        return availableWorkers.reduce((prev, curr) =>
          curr.status.load < prev.status.load ? curr : prev
        );

      case 'random':
        return availableWorkers[Math.floor(Math.random() * availableWorkers.length)];

      default:
        return availableWorkers[0];
    }
  }
}

/**
 * Distributed pipeline executor
 */
export class DistributedPipelineExecutor {
  private workerPool: WorkerPool;
  private loadBalancer: LoadBalancer;

  constructor(options: {
    workerPool: WorkerPool;
    loadBalancer?: LoadBalancer;
  }) {
    this.workerPool = options.workerPool;
    this.loadBalancer = options.loadBalancer || new LoadBalancer('least-loaded');
  }

  /**
   * Execute a stage on the worker pool
   */
  async executeStage(
    stage: PipelineStage,
    context: PipelineContext,
    options?: {
      priority?: number;
      maxAttempts?: number;
    }
  ): Promise<StageResult> {
    return new Promise((resolve, reject) => {
      const workItem: WorkItem = {
        id: `work-${Date.now()}-${Math.random()}`,
        stageId: stage.name,
        stageName: stage.name,
        context,
        priority: options?.priority || 5,
        timestamp: Date.now(),
        attempts: 0,
        maxAttempts: options?.maxAttempts || 3,
      };

      let completed = false;

      const onComplete = (data: any) => {
        if (data.item.id === workItem.id && !completed) {
          completed = true;
          this.workerPool.off('task-complete', onComplete);
          this.workerPool.off('task-error', onError);
          resolve(data.result);
        }
      };

      const onError = (data: any) => {
        if (data.item.id === workItem.id && data.item.attempts >= workItem.maxAttempts && !completed) {
          completed = true;
          this.workerPool.off('task-complete', onComplete);
          this.workerPool.off('task-error', onError);
          reject(data.error);
        }
      };

      this.workerPool.on('task-complete', onComplete);
      this.workerPool.on('task-error', onError);

      this.workerPool.submitWork(workItem);
    });
  }

  /**
   * Get executor statistics
   */
  getStats() {
    return this.workerPool.getStats();
  }
}

/**
 * Create a distributed pipeline middleware
 */
export function createDistributedMiddleware(executor: DistributedPipelineExecutor) {
  return {
    name: 'distributed',
    onStageStart: async (context: PipelineContext, stage: PipelineStage) => {
      (context.metadata as any).distributedExecution = true;
      (context.metadata as any).workerStats = executor.getStats();
    },
  };
}
