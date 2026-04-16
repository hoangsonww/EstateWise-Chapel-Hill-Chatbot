import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export interface ReplayEntry<T = unknown> {
  key: string;
  createdAt: string;
  value: T;
}

interface ReplayStoreFile<T> {
  version: 1;
  entries: ReplayEntry<T>[];
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.floor(parsed);
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => sortObject(item));
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(raw).sort()) {
      sorted[key] = sortObject(raw[key]);
    }
    return sorted;
  }
  return value;
}

export function createReplayKey(input: Record<string, unknown>): string {
  const normalized = JSON.stringify(sortObject(input));
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export class ReplayStore<T = unknown> {
  private readonly filePath?: string;
  private readonly maxEntries: number;
  private readonly entries = new Map<string, ReplayEntry<T>>();

  constructor(options: { filePath?: string; maxEntries?: number } = {}) {
    this.filePath =
      options.filePath && options.filePath.trim().length > 0
        ? path.resolve(options.filePath)
        : undefined;
    this.maxEntries = Math.max(
      1,
      options.maxEntries ??
        toInt(process.env.LANGGRAPH_REPLAY_MAX_ENTRIES, 500),
    );
    this.load();
  }

  get(key: string): ReplayEntry<T> | undefined {
    return this.entries.get(key);
  }

  set(key: string, value: T): ReplayEntry<T> {
    const entry: ReplayEntry<T> = {
      key,
      createdAt: new Date().toISOString(),
      value,
    };
    this.entries.set(key, entry);
    this.trim();
    this.persist();
    return entry;
  }

  stats() {
    return {
      entries: this.entries.size,
      maxEntries: this.maxEntries,
      filePath: this.filePath || null,
    };
  }

  clear() {
    this.entries.clear();
    this.persist();
  }

  private trim() {
    if (this.entries.size <= this.maxEntries) return;
    const sorted = Array.from(this.entries.values()).sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    while (sorted.length > this.maxEntries) {
      const removed = sorted.shift();
      if (!removed) break;
      this.entries.delete(removed.key);
    }
  }

  private load() {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as ReplayStoreFile<T>;
      const list = Array.isArray(parsed.entries) ? parsed.entries : [];
      this.entries.clear();
      for (const entry of list) {
        if (!entry || typeof entry.key !== "string") continue;
        this.entries.set(entry.key, entry);
      }
      this.trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.warn(
        `[langgraph-replay] Failed to load replay store ${this.filePath}; using empty cache. ${message}`,
      );
      this.entries.clear();
    }
  }

  private persist() {
    if (!this.filePath) return;
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const payload: ReplayStoreFile<T> = {
      version: 1,
      entries: Array.from(this.entries.values()),
    };
    const tempPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
      fs.renameSync(tempPath, this.filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.warn(
        `[langgraph-replay] Failed to persist replay store ${this.filePath}. ${message}`,
      );
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  }
}

const defaultReplayStore = new ReplayStore({
  filePath: process.env.LANGGRAPH_REPLAY_STORE_PATH,
});

export function isDeterministicDefaultEnabled(): boolean {
  return toBool(process.env.LANGGRAPH_DETERMINISTIC_DEFAULT, false);
}

export function isReplayEnabled(): boolean {
  return toBool(process.env.LANGGRAPH_REPLAY_ENABLED, true);
}

export function getDefaultReplayStore<T = unknown>(): ReplayStore<T> {
  return defaultReplayStore as ReplayStore<T>;
}

export const __replayTestUtils = {
  toBool,
  toInt,
  sortObject,
};
