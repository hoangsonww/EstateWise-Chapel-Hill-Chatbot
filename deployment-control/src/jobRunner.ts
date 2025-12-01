import { spawn } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import { JobRecord, JobResponse, JobType } from "./types";

const jobs = new Map<string, JobRecord>();
const MAX_LOG_LINES = 500;

interface RunJobOptions {
  type: JobType;
  description: string;
  command: string;
  args?: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  parameters?: Record<string, unknown>;
}

const newId = (): string => {
  if (typeof randomUUID === "function") {
    return randomUUID();
  }

  return `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
};

const toResponse = (record: JobRecord): JobResponse => ({
  ...record,
  createdAt: record.createdAt.toISOString(),
  startedAt: record.startedAt ? record.startedAt.toISOString() : undefined,
  finishedAt: record.finishedAt ? record.finishedAt.toISOString() : undefined,
});

const appendOutput = (record: JobRecord, chunk: string): void => {
  const normalized = chunk.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  record.output.push(...lines);

  if (record.output.length > MAX_LOG_LINES) {
    record.output.splice(0, record.output.length - MAX_LOG_LINES);
  }
};

export const runJob = (options: RunJobOptions): JobResponse => {
  const id = newId();
  const args = options.args ?? [];
  const job: JobRecord = {
    id,
    type: options.type,
    description: options.description,
    command: `${options.command} ${args.join(" ")}`.trim(),
    status: "running",
    createdAt: new Date(),
    startedAt: new Date(),
    output: [],
    parameters: options.parameters,
    exitCode: null,
  };

  jobs.set(id, job);

  const child = spawn(options.command, args, {
    cwd: path.resolve(options.cwd),
    env: { ...process.env, ...options.env },
  });

  child.stdout.on("data", (data: Buffer) => {
    const current = jobs.get(id);
    if (!current) {
      return;
    }

    appendOutput(current, data.toString());
  });

  child.stderr.on("data", (data: Buffer) => {
    const current = jobs.get(id);
    if (!current) {
      return;
    }

    appendOutput(current, data.toString());
  });

  child.on("error", (error: Error) => {
    const current = jobs.get(id);
    if (!current) {
      return;
    }

    current.error = error.message;
    current.status = "failed";
    current.exitCode = null;
    current.finishedAt = new Date();
  });

  child.on("close", (code: number | null) => {
    const current = jobs.get(id);
    if (!current) {
      return;
    }

    current.exitCode = code;
    current.finishedAt = new Date();
    current.status = code === 0 ? "succeeded" : "failed";
  });

  return toResponse(job);
};

export const listJobs = (limit = 50): JobResponse[] => {
  const values = Array.from(jobs.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  return values.slice(0, limit).map(toResponse);
};

export const findJob = (id: string): JobResponse | undefined => {
  const record = jobs.get(id);
  return record ? toResponse(record) : undefined;
};
