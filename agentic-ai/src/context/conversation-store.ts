/**
 * In-memory conversation store for multi-turn agent sessions.
 * Tracks messages, summaries, entities, and lifecycle (archive/cleanup).
 */
import fs from "node:fs";
import path from "node:path";

export interface ConversationMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface ConversationRecord {
  id: string;
  messages: ConversationMessage[];
  summary: string | null;
  entities: Map<string, Set<string>>;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

export interface ConversationStoreOptions {
  persistPath?: string;
  autosave?: boolean;
}

interface ConversationSnapshot {
  conversations: Array<{
    id: string;
    messages: ConversationMessage[];
    summary: string | null;
    entities: Record<string, string[]>;
    createdAt: number;
    updatedAt: number;
    archived: boolean;
  }>;
}

export class ConversationStore {
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly persistPath?: string;
  private readonly autosave: boolean;

  constructor(options: ConversationStoreOptions = {}) {
    this.persistPath =
      options.persistPath && options.persistPath.trim().length > 0
        ? path.resolve(options.persistPath)
        : undefined;
    this.autosave = options.autosave ?? true;
    if (this.persistPath && fs.existsSync(this.persistPath)) {
      const raw = fs.readFileSync(this.persistPath, "utf8");
      this.importSnapshot(JSON.parse(raw));
    }
  }

  /**
   * Create a new conversation and return its ID.
   */
  create(id: string): string {
    const record: ConversationRecord = {
      id,
      messages: [],
      summary: null,
      entities: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
    };
    this.conversations.set(id, record);
    this.persistIfEnabled();
    return id;
  }

  /**
   * Get a conversation by ID. Returns undefined for missing or archived.
   */
  get(id: string):
    | {
        id: string;
        messages: ConversationMessage[];
        summary: string | null;
        entities: Record<string, string[]>;
        createdAt: number;
        updatedAt: number;
      }
    | undefined {
    const record = this.conversations.get(id);
    if (!record || record.archived) return undefined;
    return {
      id: record.id,
      messages: [...record.messages],
      summary: record.summary,
      entities: this.serializeEntities(record.entities),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Append a message to a conversation.
   */
  appendMessage(
    id: string,
    message: Omit<ConversationMessage, "timestamp">,
  ): void {
    const record = this.conversations.get(id);
    if (!record || record.archived) return;
    const suppliedTimestamp = (message as any).timestamp;
    const timestamp = Number.isFinite(suppliedTimestamp)
      ? Number(suppliedTimestamp)
      : Date.now();
    record.messages.push({ ...message, timestamp });
    record.updatedAt = Date.now();
    this.persistIfEnabled();
  }

  /**
   * Replace the running summary for a conversation.
   */
  updateSummary(id: string, summary: string): void {
    const record = this.conversations.get(id);
    if (!record) return;
    record.summary = summary;
    record.updatedAt = Date.now();
    this.persistIfEnabled();
  }

  /**
   * Track a named entity within a conversation.
   */
  trackEntity(id: string, entityType: string, entityValue: string): void {
    const record = this.conversations.get(id);
    if (!record) return;
    if (!record.entities.has(entityType)) {
      record.entities.set(entityType, new Set());
    }
    record.entities.get(entityType)!.add(entityValue);
    record.updatedAt = Date.now();
    this.persistIfEnabled();
  }

  /**
   * Mark a conversation as archived (soft-delete).
   */
  archive(id: string): void {
    const record = this.conversations.get(id);
    if (record) {
      record.archived = true;
      record.updatedAt = Date.now();
      this.persistIfEnabled();
    }
  }

  /**
   * Permanently delete a conversation.
   */
  delete(id: string): boolean {
    const deleted = this.conversations.delete(id);
    if (deleted) this.persistIfEnabled();
    return deleted;
  }

  /**
   * List all active (non-archived) conversation IDs.
   */
  listActive(): string[] {
    const result: string[] = [];
    for (const [id, record] of this.conversations) {
      if (!record.archived) result.push(id);
    }
    return result;
  }

  /**
   * Remove conversations older than maxAgeDays (default 30).
   */
  cleanup(maxAgeDays = 30): number {
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1_000;
    let removed = 0;
    for (const [id, record] of this.conversations) {
      if (record.updatedAt < cutoff) {
        this.conversations.delete(id);
        removed++;
      }
    }
    if (removed > 0) this.persistIfEnabled();
    return removed;
  }

  exportSnapshot(): ConversationSnapshot {
    const conversations: ConversationSnapshot["conversations"] = [];
    for (const [, record] of this.conversations) {
      conversations.push({
        id: record.id,
        messages: [...record.messages],
        summary: record.summary,
        entities: this.serializeEntities(record.entities),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        archived: record.archived,
      });
    }
    return { conversations };
  }

  importSnapshot(snapshot: ConversationSnapshot): void {
    this.conversations.clear();
    const entries = Array.isArray(snapshot?.conversations)
      ? snapshot.conversations
      : [];
    for (const record of entries) {
      const entities = new Map<string, Set<string>>();
      for (const [key, values] of Object.entries(record.entities || {})) {
        entities.set(key, new Set(Array.isArray(values) ? values : []));
      }
      this.conversations.set(record.id, {
        id: record.id,
        messages: Array.isArray(record.messages) ? record.messages : [],
        summary: record.summary ?? null,
        entities,
        createdAt: Number(record.createdAt) || Date.now(),
        updatedAt: Number(record.updatedAt) || Date.now(),
        archived: !!record.archived,
      });
    }
    this.persistIfEnabled();
  }

  private serializeEntities(
    entities: Map<string, Set<string>>,
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [type, values] of entities) {
      result[type] = [...values];
    }
    return result;
  }

  private persistIfEnabled() {
    if (!this.persistPath || !this.autosave) return;
    const dir = path.dirname(this.persistPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      this.persistPath,
      JSON.stringify(this.exportSnapshot(), null, 2),
      "utf8",
    );
  }
}
