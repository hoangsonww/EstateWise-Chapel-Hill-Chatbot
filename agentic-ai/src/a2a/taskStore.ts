import { randomUUID } from "node:crypto";
import type { A2ATaskEvent, A2ATaskInput, A2ATaskRecord } from "./types.js";

type TaskRunFn = (input: A2ATaskInput) => Promise<unknown>;
type TaskListener = (event: A2ATaskEvent) => void;

interface InternalTaskState {
  task: A2ATaskRecord;
  cancelRequested: boolean;
  events: A2ATaskEvent[];
}

export interface A2ATaskStoreOptions {
  maxTasks?: number;
  retentionMs?: number;
}

export class A2ATaskStore {
  private readonly taskById = new Map<string, InternalTaskState>();
  private readonly listeners = new Map<string, Set<TaskListener>>();
  private readonly maxTasks: number;
  private readonly retentionMs: number;

  constructor(
    private readonly runTask: TaskRunFn,
    options: A2ATaskStoreOptions = {},
  ) {
    this.maxTasks = Math.max(10, options.maxTasks ?? 500);
    this.retentionMs = Math.max(
      60_000,
      options.retentionMs ?? 24 * 60 * 60_000,
    );
  }

  create(
    input: A2ATaskInput,
    metadata?: Record<string, unknown>,
  ): A2ATaskRecord {
    const nowIso = new Date().toISOString();
    const task: A2ATaskRecord = {
      id: randomUUID(),
      status: "queued",
      input,
      metadata,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const state: InternalTaskState = {
      task,
      cancelRequested: false,
      events: [],
    };
    this.taskById.set(task.id, state);
    this.emit(task.id, "created");

    // Queue execution on the next tick to return immediately.
    setTimeout(() => {
      void this.execute(task.id);
    }, 0);

    this.evictIfNeeded();
    return this.snapshot(task.id)!;
  }

  get(taskId: string): A2ATaskRecord | null {
    return this.snapshot(taskId);
  }

  list(limit = 20): A2ATaskRecord[] {
    const max = Math.min(Math.max(1, limit), 200);
    return Array.from(this.taskById.values())
      .map((entry) => entry.task)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, max)
      .map((task) => this.cloneTask(task));
  }

  cancel(taskId: string): A2ATaskRecord | null {
    const state = this.taskById.get(taskId);
    if (!state) return null;
    if (this.isTerminal(state.task.status)) return this.cloneTask(state.task);

    state.cancelRequested = true;
    if (state.task.status === "queued") {
      this.transition(taskId, {
        status: "canceled",
        finishedAt: new Date().toISOString(),
      });
      this.emit(taskId, "canceled");
    } else {
      this.emit(taskId, "updated");
    }
    return this.cloneTask(state.task);
  }

  async wait(taskId: string, timeoutMs = 120_000): Promise<A2ATaskRecord> {
    const current = this.taskById.get(taskId);
    if (!current) throw new Error(`Task not found: ${taskId}`);
    if (this.isTerminal(current.task.status))
      return this.cloneTask(current.task);

    return await new Promise<A2ATaskRecord>((resolve, reject) => {
      let unsubscribe = () => {};
      const timer = setTimeout(
        () => {
          unsubscribe();
          reject(new Error(`Timed out waiting for task ${taskId}`));
        },
        Math.max(1_000, timeoutMs),
      );

      unsubscribe = this.subscribe(taskId, (event) => {
        if (this.isTerminal(event.task.status)) {
          clearTimeout(timer);
          unsubscribe();
          resolve(this.cloneTask(event.task));
        }
      });
    });
  }

  subscribe(taskId: string, listener: TaskListener): () => void {
    const set = this.listeners.get(taskId) ?? new Set<TaskListener>();
    set.add(listener);
    this.listeners.set(taskId, set);

    return () => {
      const current = this.listeners.get(taskId);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) this.listeners.delete(taskId);
    };
  }

  recentEvents(taskId: string, limit = 20): A2ATaskEvent[] {
    const state = this.taskById.get(taskId);
    if (!state) return [];
    const max = Math.min(Math.max(1, limit), 100);
    return state.events.slice(-max).map((event) => ({
      ...event,
      task: this.cloneTask(event.task),
    }));
  }

  private async execute(taskId: string): Promise<void> {
    const state = this.taskById.get(taskId);
    if (!state) return;
    if (state.cancelRequested || state.task.status !== "queued") return;

    const startedAt = new Date().toISOString();
    this.transition(taskId, { status: "running", startedAt });
    this.emit(taskId, "started");

    try {
      const output = await this.runTask(state.task.input);

      if (state.cancelRequested) {
        this.transition(taskId, {
          status: "canceled",
          finishedAt: new Date().toISOString(),
        });
        this.emit(taskId, "canceled");
      } else {
        this.transition(taskId, {
          status: "succeeded",
          output,
          finishedAt: new Date().toISOString(),
        });
        this.emit(taskId, "succeeded");
      }
    } catch (error) {
      this.transition(taskId, {
        status: "failed",
        error: {
          message: error instanceof Error ? error.message : String(error),
        },
        finishedAt: new Date().toISOString(),
      });
      this.emit(taskId, "failed");
    } finally {
      this.pruneExpired();
    }
  }

  private transition(
    taskId: string,
    patch: Partial<Omit<A2ATaskRecord, "id" | "createdAt" | "input">>,
  ) {
    const state = this.taskById.get(taskId);
    if (!state) return;
    state.task = {
      ...state.task,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
  }

  private emit(taskId: string, type: A2ATaskEvent["type"]) {
    const state = this.taskById.get(taskId);
    if (!state) return;
    const event: A2ATaskEvent = {
      type,
      at: new Date().toISOString(),
      task: this.cloneTask(state.task),
    };
    state.events.push(event);
    if (state.events.length > 100) state.events.shift();

    const subscribers = this.listeners.get(taskId);
    if (!subscribers) return;
    for (const listener of subscribers) {
      listener(event);
    }
  }

  private pruneExpired() {
    const now = Date.now();
    for (const [taskId, state] of this.taskById.entries()) {
      if (!this.isTerminal(state.task.status) || !state.task.finishedAt)
        continue;
      const finishedAtMs = Date.parse(state.task.finishedAt);
      if (Number.isNaN(finishedAtMs)) continue;
      if (now - finishedAtMs > this.retentionMs) {
        this.taskById.delete(taskId);
        this.listeners.delete(taskId);
      }
    }
  }

  private evictIfNeeded() {
    if (this.taskById.size <= this.maxTasks) return;
    const oldestFinished = Array.from(this.taskById.values())
      .map((entry) => entry.task)
      .filter((task) => task.finishedAt)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));

    for (const task of oldestFinished) {
      if (this.taskById.size <= this.maxTasks) break;
      this.taskById.delete(task.id);
      this.listeners.delete(task.id);
    }
  }

  private snapshot(taskId: string): A2ATaskRecord | null {
    const state = this.taskById.get(taskId);
    if (!state) return null;
    return this.cloneTask(state.task);
  }

  private cloneTask(task: A2ATaskRecord): A2ATaskRecord {
    return {
      ...task,
      input: { ...task.input },
      metadata: task.metadata ? { ...task.metadata } : undefined,
      output: task.output,
      error: task.error ? { ...task.error } : undefined,
    };
  }

  private isTerminal(status: A2ATaskRecord["status"]): boolean {
    return (
      status === "succeeded" || status === "failed" || status === "canceled"
    );
  }
}
