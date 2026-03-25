/**
 * Batch Processor — runs multiple agent tasks with controlled concurrency.
 */

import { randomUUID } from "node:crypto";
import { BatchJob, BatchItem, BatchStatus, TaskResult } from "./types.js";

/** Processes batches of tasks against an agent executor. */
export class BatchProcessor {
  private jobs = new Map<string, BatchJob>();

  /** Create a new batch job from a list of input strings. */
  createJob(inputs: string[], concurrency = 3): BatchJob {
    const items: BatchItem[] = inputs.map((input) => ({
      itemId: randomUUID(),
      input,
      status: "pending",
    }));

    const job: BatchJob = {
      jobId: randomUUID(),
      status: "queued",
      items,
      concurrency,
      createdAt: Date.now(),
      progress: { completed: 0, failed: 0, total: items.length },
    };

    this.jobs.set(job.jobId, job);
    return job;
  }

  /**
   * Process all items in a job with the given executor, respecting concurrency.
   */
  async processJob(
    jobId: string,
    executor: (input: string) => Promise<TaskResult>,
  ): Promise<BatchJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Batch job "${jobId}" not found`);
    if (job.status === "cancelled") return job;

    job.status = "processing";
    job.startedAt = Date.now();

    const pending = [...job.items];
    const active: Promise<void>[] = [];

    const runItem = async (item: BatchItem): Promise<void> => {
      if (job.status === "cancelled") return;
      item.status = "running";
      item.startedAt = Date.now();
      try {
        const result = await executor(item.input);
        item.result = result;
        item.status = result.success ? "completed" : "failed";
        item.error = result.error?.message;
        if (result.success) {
          job.progress.completed++;
        } else {
          job.progress.failed++;
        }
      } catch (err) {
        item.status = "failed";
        item.error = err instanceof Error ? err.message : String(err);
        job.progress.failed++;
      }
      item.completedAt = Date.now();
    };

    // Process with concurrency control
    while (pending.length > 0 || active.length > 0) {
      while (active.length < job.concurrency && pending.length > 0) {
        const item = pending.shift()!;
        const promise = runItem(item).then(() => {
          const idx = active.indexOf(promise);
          if (idx >= 0) active.splice(idx, 1);
        });
        active.push(promise);
      }
      if (active.length > 0) {
        await Promise.race(active);
      }
    }

    job.completedAt = Date.now();
    job.status =
      job.progress.failed === job.progress.total
        ? "failed"
        : "completed";

    return job;
  }

  /** Retrieve a job by ID. */
  getJob(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  /** List all tracked jobs. */
  listJobs(): BatchJob[] {
    return Array.from(this.jobs.values());
  }

  /** Cancel a pending or in-progress job. */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.status === "completed" || job.status === "failed") return false;
    job.status = "cancelled";
    return true;
  }
}
