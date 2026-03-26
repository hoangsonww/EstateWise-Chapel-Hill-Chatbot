/**
 * Coherence manager: tracks conversation turns, entities, and
 * summaries to maintain coherent multi-turn context.
 */

export interface CoherenceContext {
  summary: string | null;
  entities: Record<string, string[]>;
  recentMessages: CoherenceMessage[];
  totalTurns: number;
  estimatedTokens: number;
}

export interface CoherenceMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  turn: number;
}

export class CoherenceManager {
  private messages: CoherenceMessage[] = [];
  private entities = new Map<string, Set<string>>();
  private summary: string | null = null;
  private turnCount = 0;
  private readonly summaryInterval: number;

  constructor(summaryInterval = 5) {
    this.summaryInterval = summaryInterval;
  }

  /**
   * Add a message and advance the turn counter.
   */
  addMessage(role: CoherenceMessage["role"], content: string): void {
    this.turnCount++;
    this.messages.push({ role, content, turn: this.turnCount });
  }

  /**
   * Track a named entity (e.g., "property" -> "123 Main St").
   */
  addEntity(type: string, value: string): void {
    if (!this.entities.has(type)) {
      this.entities.set(type, new Set());
    }
    this.entities.get(type)!.add(value);
  }

  /**
   * Returns true every N turns (default 5) to signal summary refresh.
   */
  needsSummaryUpdate(): boolean {
    if (this.turnCount === 0) return false;
    return this.turnCount % this.summaryInterval === 0;
  }

  /**
   * Replace the running summary.
   */
  updateSummary(newSummary: string): void {
    this.summary = newSummary;
  }

  /**
   * Return messages that should be included in the next summarization pass.
   * These are messages since the last summary update.
   */
  getMessagesToSummarize(): CoherenceMessage[] {
    // Return the last `summaryInterval` messages for summarization
    return this.messages.slice(-this.summaryInterval);
  }

  /**
   * Build the current coherence context snapshot.
   */
  getContext(recentCount = 10): CoherenceContext {
    const recentMessages = this.messages.slice(-recentCount);
    const entityRecord: Record<string, string[]> = {};
    for (const [type, values] of this.entities) {
      entityRecord[type] = [...values];
    }

    const estimatedTokens = this.estimateTokens(recentMessages);

    return {
      summary: this.summary,
      entities: entityRecord,
      recentMessages,
      totalTurns: this.turnCount,
      estimatedTokens,
    };
  }

  /**
   * Build an XML-formatted context prompt for injection.
   */
  buildContextPrompt(recentCount = 10): string {
    const ctx = this.getContext(recentCount);
    const parts: string[] = ["<coherence-context>"];

    if (ctx.summary) {
      parts.push(`  <summary>${ctx.summary}</summary>`);
    }

    const entityTypes = Object.keys(ctx.entities);
    if (entityTypes.length > 0) {
      parts.push("  <entities>");
      for (const type of entityTypes) {
        for (const value of ctx.entities[type]) {
          parts.push(`    <entity type="${type}">${value}</entity>`);
        }
      }
      parts.push("  </entities>");
    }

    if (ctx.recentMessages.length > 0) {
      parts.push("  <recent-messages>");
      for (const msg of ctx.recentMessages) {
        parts.push(
          `    <message role="${msg.role}" turn="${msg.turn}">${msg.content}</message>`,
        );
      }
      parts.push("  </recent-messages>");
    }

    parts.push(
      `  <meta turns="${ctx.totalTurns}" estimated-tokens="${ctx.estimatedTokens}" />`,
    );
    parts.push("</coherence-context>");

    return parts.join("\n");
  }

  private estimateTokens(messages: CoherenceMessage[]): number {
    let chars = 0;
    if (this.summary) chars += this.summary.length;
    for (const msg of messages) {
      chars += msg.content.length;
    }
    for (const values of this.entities.values()) {
      for (const v of values) chars += v.length;
    }
    return Math.ceil(chars / 4);
  }
}
