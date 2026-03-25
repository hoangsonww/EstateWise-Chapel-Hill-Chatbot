/**
 * Prompt versioning and registry for EstateWise prompt engineering system.
 * Tracks prompt versions, metrics, rollback, and active-version selection.
 */

export interface PromptMetrics {
  totalCalls: number;
  avgLatencyMs: number;
  successRate: number;
  avgTokensIn: number;
  avgTokensOut: number;
  groundingViolationRate: number;
  userSatisfactionScore: number;
}

export interface PromptVersion {
  id: string;
  version: string;
  content: string;
  createdAt: Date;
  changelog: string;
  metrics: PromptMetrics;
  isActive: boolean;
}

/**
 * In-memory prompt registry that tracks multiple versions of each prompt,
 * supports rollback, and records usage metrics.
 */
export class PromptRegistry {
  private store: Map<string, PromptVersion[]> = new Map();

  /**
   * Register a new prompt version. The first registered version becomes active
   * automatically. Subsequent versions must be explicitly activated via rollback
   * or by registering with `activate: true`.
   */
  register(
    id: string,
    version: string,
    content: string,
    changelog: string,
    activate = false,
  ): PromptVersion {
    const existing = this.store.get(id) ?? [];

    const entry: PromptVersion = {
      id,
      version,
      content,
      createdAt: new Date(),
      changelog,
      metrics: {
        totalCalls: 0,
        avgLatencyMs: 0,
        successRate: 1,
        avgTokensIn: 0,
        avgTokensOut: 0,
        groundingViolationRate: 0,
        userSatisfactionScore: 0,
      },
      isActive: existing.length === 0 || activate,
    };

    if (entry.isActive) {
      for (const v of existing) {
        v.isActive = false;
      }
    }

    existing.push(entry);
    this.store.set(id, existing);
    return entry;
  }

  /**
   * Return the currently-active version for a prompt id, or undefined if
   * no versions exist.
   */
  getActive(id: string): PromptVersion | undefined {
    const versions = this.store.get(id);
    if (!versions) return undefined;
    return versions.find((v) => v.isActive);
  }

  /**
   * Retrieve a specific version of a prompt by id and version string.
   */
  getVersion(id: string, version: string): PromptVersion | undefined {
    const versions = this.store.get(id);
    if (!versions) return undefined;
    return versions.find((v) => v.version === version);
  }

  /**
   * Rollback to a specific version, making it active and deactivating all others.
   * Returns the newly-active version or undefined if the target was not found.
   */
  rollback(id: string, targetVersion: string): PromptVersion | undefined {
    const versions = this.store.get(id);
    if (!versions) return undefined;

    const target = versions.find((v) => v.version === targetVersion);
    if (!target) return undefined;

    for (const v of versions) {
      v.isActive = false;
    }
    target.isActive = true;
    return target;
  }

  /**
   * Update metrics for the currently-active version of a prompt.
   * Accepts a partial PromptMetrics and merges with existing values.
   */
  updateMetrics(id: string, partial: Partial<PromptMetrics>): void {
    const active = this.getActive(id);
    if (!active) return;
    Object.assign(active.metrics, partial);
  }

  /**
   * List all versions of a given prompt, ordered by creation date ascending.
   */
  listVersions(id: string): PromptVersion[] {
    const versions = this.store.get(id);
    if (!versions) return [];
    return [...versions].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );
  }

  /**
   * List all prompt ids registered in the registry.
   */
  listAllPrompts(): string[] {
    return Array.from(this.store.keys());
  }
}
