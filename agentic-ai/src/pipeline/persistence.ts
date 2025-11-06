/**
 * State Persistence and Checkpointing
 *
 * Advanced state management for long-running pipelines with save/restore,
 * checkpointing, rollback, and distributed state support.
 */

import { writeFile, readFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import type { PipelineContext, PipelineResult } from "./types.js";

/**
 * Checkpoint data structure
 */
export interface Checkpoint {
  id: string;
  executionId: string;
  pipelineName: string;
  timestamp: number;
  context: PipelineContext;
  completedStages: string[];
  currentStage?: string;
  metadata: Record<string, unknown>;
}

/**
 * State snapshot for rollback
 */
export interface StateSnapshot {
  id: string;
  timestamp: number;
  state: Record<string, unknown>;
  blackboard: any;
  messages: any[];
}

/**
 * State storage backend interface
 */
export interface StateStorage {
  save(key: string, data: unknown): Promise<void>;
  load(key: string): Promise<unknown | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * File-based state storage
 */
export class FileStateStorage implements StateStorage {
  constructor(private basePath: string = "./.pipeline-state") {}

  async save(key: string, data: unknown): Promise<void> {
    if (!existsSync(this.basePath)) {
      await mkdir(this.basePath, { recursive: true });
    }
    const filePath = join(this.basePath, `${key}.json`);
    await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  async load(key: string): Promise<unknown | null> {
    const filePath = join(this.basePath, `${key}.json`);
    if (!existsSync(filePath)) {
      return null;
    }
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  }

  async delete(key: string): Promise<void> {
    const filePath = join(this.basePath, `${key}.json`);
    if (existsSync(filePath)) {
      const fs = await import("fs/promises");
      await fs.unlink(filePath);
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = join(this.basePath, `${key}.json`);
    return existsSync(filePath);
  }

  async list(prefix?: string): Promise<string[]> {
    if (!existsSync(this.basePath)) {
      return [];
    }
    const fs = await import("fs/promises");
    const files = await fs.readdir(this.basePath);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    if (prefix) {
      return jsonFiles
        .filter((f) => f.startsWith(prefix))
        .map((f) => f.replace(".json", ""));
    }

    return jsonFiles.map((f) => f.replace(".json", ""));
  }
}

/**
 * In-memory state storage (for testing)
 */
export class MemoryStateStorage implements StateStorage {
  private store = new Map<string, unknown>();

  async save(key: string, data: unknown): Promise<void> {
    this.store.set(key, JSON.parse(JSON.stringify(data)));
  }

  async load(key: string): Promise<unknown | null> {
    return this.store.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());
    if (prefix) {
      return keys.filter((k) => k.startsWith(prefix));
    }
    return keys;
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Redis-based state storage (for distributed systems)
 */
export class RedisStateStorage implements StateStorage {
  private client: any;

  constructor(redisClient: any) {
    this.client = redisClient;
  }

  async save(key: string, data: unknown): Promise<void> {
    await this.client.set(key, JSON.stringify(data));
  }

  async load(key: string): Promise<unknown | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async list(prefix?: string): Promise<string[]> {
    const pattern = prefix ? `${prefix}*` : "*";
    return await this.client.keys(pattern);
  }
}

/**
 * Checkpoint manager for pipeline state
 */
export class CheckpointManager {
  private storage: StateStorage;
  private checkpointInterval: number;
  private maxCheckpoints: number;

  constructor(options?: {
    storage?: StateStorage;
    checkpointInterval?: number;
    maxCheckpoints?: number;
  }) {
    this.storage = options?.storage || new FileStateStorage();
    this.checkpointInterval = options?.checkpointInterval || 30000; // 30 seconds
    this.maxCheckpoints = options?.maxCheckpoints || 10;
  }

  /**
   * Create a checkpoint of current pipeline state
   */
  async createCheckpoint(
    executionId: string,
    pipelineName: string,
    context: PipelineContext,
    completedStages: string[],
    currentStage?: string,
  ): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: `checkpoint-${executionId}-${Date.now()}`,
      executionId,
      pipelineName,
      timestamp: Date.now(),
      context: this.serializeContext(context),
      completedStages: [...completedStages],
      currentStage,
      metadata: {
        version: "1.0",
        nodeId: process.env.NODE_ID || "local",
      },
    };

    await this.storage.save(checkpoint.id, checkpoint);
    await this.cleanupOldCheckpoints(executionId);

    return checkpoint;
  }

  /**
   * Restore pipeline state from checkpoint
   */
  async restoreCheckpoint(checkpointId: string): Promise<Checkpoint | null> {
    const checkpoint = (await this.storage.load(
      checkpointId,
    )) as Checkpoint | null;
    return checkpoint;
  }

  /**
   * List all checkpoints for an execution
   */
  async listCheckpoints(executionId: string): Promise<Checkpoint[]> {
    const keys = await this.storage.list(`checkpoint-${executionId}`);
    const checkpoints: Checkpoint[] = [];

    for (const key of keys) {
      const checkpoint = (await this.storage.load(key)) as Checkpoint;
      if (checkpoint) {
        checkpoints.push(checkpoint);
      }
    }

    return checkpoints.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get the latest checkpoint for an execution
   */
  async getLatestCheckpoint(executionId: string): Promise<Checkpoint | null> {
    const checkpoints = await this.listCheckpoints(executionId);
    return checkpoints[0] || null;
  }

  /**
   * Delete a checkpoint
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    await this.storage.delete(checkpointId);
  }

  /**
   * Clean up old checkpoints beyond max limit
   */
  private async cleanupOldCheckpoints(executionId: string): Promise<void> {
    const checkpoints = await this.listCheckpoints(executionId);

    if (checkpoints.length > this.maxCheckpoints) {
      const toDelete = checkpoints.slice(this.maxCheckpoints);
      for (const checkpoint of toDelete) {
        await this.deleteCheckpoint(checkpoint.id);
      }
    }
  }

  /**
   * Serialize context for storage
   */
  private serializeContext(context: PipelineContext): PipelineContext {
    // Deep clone to avoid reference issues
    return JSON.parse(
      JSON.stringify({
        executionId: context.executionId,
        input: context.input,
        state: context.state,
        blackboard: context.blackboard,
        messages: context.messages,
        metadata: context.metadata,
      }),
    );
  }
}

/**
 * State snapshot manager for rollback
 */
export class SnapshotManager {
  private snapshots = new Map<string, StateSnapshot[]>();
  private maxSnapshots: number;

  constructor(options?: { maxSnapshots?: number }) {
    this.maxSnapshots = options?.maxSnapshots || 20;
  }

  /**
   * Create a snapshot of current state
   */
  createSnapshot(
    executionId: string,
    state: Record<string, unknown>,
    blackboard: any,
    messages: any[],
  ): StateSnapshot {
    const snapshot: StateSnapshot = {
      id: `snapshot-${Date.now()}`,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state)),
      blackboard: JSON.parse(JSON.stringify(blackboard)),
      messages: JSON.parse(JSON.stringify(messages)),
    };

    if (!this.snapshots.has(executionId)) {
      this.snapshots.set(executionId, []);
    }

    const snapshots = this.snapshots.get(executionId)!;
    snapshots.push(snapshot);

    // Cleanup old snapshots
    if (snapshots.length > this.maxSnapshots) {
      snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get a specific snapshot
   */
  getSnapshot(executionId: string, snapshotId: string): StateSnapshot | null {
    const snapshots = this.snapshots.get(executionId);
    if (!snapshots) return null;

    return snapshots.find((s) => s.id === snapshotId) || null;
  }

  /**
   * Get all snapshots for an execution
   */
  getSnapshots(executionId: string): StateSnapshot[] {
    return this.snapshots.get(executionId) || [];
  }

  /**
   * Get the latest snapshot
   */
  getLatestSnapshot(executionId: string): StateSnapshot | null {
    const snapshots = this.snapshots.get(executionId);
    if (!snapshots || snapshots.length === 0) return null;

    return snapshots[snapshots.length - 1];
  }

  /**
   * Rollback to a specific snapshot
   */
  rollbackTo(
    executionId: string,
    snapshotId: string,
  ): {
    state: Record<string, unknown>;
    blackboard: any;
    messages: any[];
  } | null {
    const snapshot = this.getSnapshot(executionId, snapshotId);
    if (!snapshot) return null;

    return {
      state: JSON.parse(JSON.stringify(snapshot.state)),
      blackboard: JSON.parse(JSON.stringify(snapshot.blackboard)),
      messages: JSON.parse(JSON.stringify(snapshot.messages)),
    };
  }

  /**
   * Clear snapshots for an execution
   */
  clearSnapshots(executionId: string): void {
    this.snapshots.delete(executionId);
  }

  /**
   * Clear all snapshots
   */
  clearAll(): void {
    this.snapshots.clear();
  }
}

/**
 * Middleware for automatic checkpointing
 */
export function createCheckpointMiddleware(
  checkpointManager: CheckpointManager,
  options?: {
    checkpointInterval?: number;
    checkpointOnStageComplete?: boolean;
  },
) {
  const checkpointInterval = options?.checkpointInterval || 30000;
  const checkpointOnStageComplete = options?.checkpointOnStageComplete ?? true;
  const lastCheckpointTime = new Map<string, number>();

  return {
    name: "checkpointing",
    onPipelineStart: async (context: PipelineContext) => {
      lastCheckpointTime.set(context.executionId, Date.now());
    },
    onStageComplete: async (
      context: PipelineContext,
      stage: any,
      result: any,
    ) => {
      const pipelineName = (context.metadata as any).pipelineName || "unknown";
      const lastTime = lastCheckpointTime.get(context.executionId) || 0;
      const now = Date.now();

      // Checkpoint if interval elapsed or if enabled on stage complete
      if (checkpointOnStageComplete || now - lastTime >= checkpointInterval) {
        await checkpointManager.createCheckpoint(
          context.executionId,
          pipelineName,
          context,
          context.metadata.completedStages,
          context.metadata.currentStage,
        );
        lastCheckpointTime.set(context.executionId, now);
      }
    },
    onPipelineComplete: async (context: PipelineContext) => {
      lastCheckpointTime.delete(context.executionId);
    },
  };
}

/**
 * Middleware for automatic snapshots
 */
export function createSnapshotMiddleware(snapshotManager: SnapshotManager) {
  return {
    name: "snapshots",
    onStageStart: async (context: PipelineContext) => {
      // Create snapshot before each stage
      snapshotManager.createSnapshot(
        context.executionId,
        context.state,
        context.blackboard,
        context.messages,
      );
    },
    onPipelineComplete: async (context: PipelineContext) => {
      // Create final snapshot
      snapshotManager.createSnapshot(
        context.executionId,
        context.state,
        context.blackboard,
        context.messages,
      );
    },
  };
}

/**
 * Resume a pipeline from checkpoint
 */
export async function resumeFromCheckpoint(
  checkpointId: string,
  checkpointManager: CheckpointManager,
  pipeline: any,
): Promise<any> {
  const checkpoint = await checkpointManager.restoreCheckpoint(checkpointId);
  if (!checkpoint) {
    throw new Error(`Checkpoint ${checkpointId} not found`);
  }

  // Find stages that haven't completed
  const allStages = pipeline.stages;
  const remainingStages = allStages.filter(
    (stage: any) => !checkpoint.completedStages.includes(stage.name),
  );

  // Create a new pipeline with only remaining stages
  const { createPipeline } = await import("./PipelineBuilder.js");
  const resumePipeline = createPipeline({
    name: `${checkpoint.pipelineName}-resume`,
  });

  for (const stage of remainingStages) {
    resumePipeline.addStage(stage);
  }

  // Restore context and execute
  const result = await resumePipeline.build().execute(checkpoint.context.input);

  return result;
}
