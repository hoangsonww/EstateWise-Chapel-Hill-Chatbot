/**
 * Dead Letter Queue — stores tasks that exhausted all recovery strategies
 * for later inspection and optional replay.
 */

import { randomUUID } from "node:crypto";
import { AgentError, DeadLetterEntry } from "./types.js";

/** In-memory dead-letter queue with purge, stats, and replay marking. */
export class DeadLetterQueue {
  private entries = new Map<string, DeadLetterEntry>();

  /** Add a failed task to the DLQ. */
  enqueue(params: {
    taskId: string;
    agentId: string;
    input: string;
    error: AgentError;
    attempts: number;
    metadata?: Record<string, unknown>;
  }): DeadLetterEntry {
    const now = Date.now();
    const entry: DeadLetterEntry = {
      entryId: randomUUID(),
      taskId: params.taskId,
      agentId: params.agentId,
      input: params.input,
      error: params.error,
      attempts: params.attempts,
      firstFailedAt: now,
      lastFailedAt: now,
      replayable: params.error.recoverable,
      markedForReplay: false,
      metadata: params.metadata ?? {},
    };
    this.entries.set(entry.entryId, entry);
    return entry;
  }

  /** List entries, optionally filtering to only those that are replayable. */
  list(options?: { replayableOnly?: boolean }): DeadLetterEntry[] {
    const all = Array.from(this.entries.values());
    if (options?.replayableOnly) {
      return all.filter((e) => e.replayable);
    }
    return all;
  }

  /** Get a single entry by ID. */
  get(entryId: string): DeadLetterEntry | undefined {
    return this.entries.get(entryId);
  }

  /** Mark an entry for replay by a future sweep. */
  markForReplay(entryId: string): boolean {
    const entry = this.entries.get(entryId);
    if (!entry || !entry.replayable) return false;
    entry.markedForReplay = true;
    return true;
  }

  /** Remove an entry from the queue (e.g., after successful replay). */
  remove(entryId: string): boolean {
    return this.entries.delete(entryId);
  }

  /**
   * Purge entries older than `maxAgeMs` (default 7 days).
   * Returns the number of entries removed.
   */
  purge(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [id, entry] of this.entries) {
      if (entry.lastFailedAt < cutoff) {
        this.entries.delete(id);
        removed++;
      }
    }
    return removed;
  }

  /** Aggregate statistics about the current queue contents. */
  stats(): {
    total: number;
    replayable: number;
    markedForReplay: number;
    byAgent: Record<string, number>;
  } {
    const byAgent: Record<string, number> = {};
    let replayable = 0;
    let markedForReplay = 0;

    for (const entry of this.entries.values()) {
      byAgent[entry.agentId] = (byAgent[entry.agentId] ?? 0) + 1;
      if (entry.replayable) replayable++;
      if (entry.markedForReplay) markedForReplay++;
    }

    return {
      total: this.entries.size,
      replayable,
      markedForReplay,
      byAgent,
    };
  }
}
