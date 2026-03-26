/**
 * In-memory conversation store for multi-turn agent sessions.
 * Tracks messages, summaries, entities, and lifecycle (archive/cleanup).
 */

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

export class ConversationStore {
  private readonly conversations = new Map<string, ConversationRecord>();

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
    record.messages.push({ ...message, timestamp: Date.now() });
    record.updatedAt = Date.now();
  }

  /**
   * Replace the running summary for a conversation.
   */
  updateSummary(id: string, summary: string): void {
    const record = this.conversations.get(id);
    if (!record) return;
    record.summary = summary;
    record.updatedAt = Date.now();
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
  }

  /**
   * Mark a conversation as archived (soft-delete).
   */
  archive(id: string): void {
    const record = this.conversations.get(id);
    if (record) {
      record.archived = true;
      record.updatedAt = Date.now();
    }
  }

  /**
   * Permanently delete a conversation.
   */
  delete(id: string): boolean {
    return this.conversations.delete(id);
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
    return removed;
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
}
