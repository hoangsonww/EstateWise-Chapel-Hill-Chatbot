/**
 * Multi-level caching with in-memory LRU (L1), stats tracking,
 * and static key-builder / TTL helpers for the EstateWise context stack.
 */

interface LRUEntry<T> {
  value: T;
  expiresAt: number;
  key: string;
}

export interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  l3Hits: number;
  l3Misses: number;
}

/**
 * Simple hash for cache key normalization.
 */
function hashKey(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return hash.toString(36);
}

export class MultiLevelCache {
  private readonly maxSize: number;
  private readonly l1 = new Map<string, LRUEntry<unknown>>();
  private readonly stats: CacheStats = {
    l1Hits: 0,
    l1Misses: 0,
    l2Hits: 0,
    l2Misses: 0,
    l3Hits: 0,
    l3Misses: 0,
  };

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  // ── L1 in-memory LRU ─────────────────────────────────────────

  get<T>(key: string): T | undefined {
    const entry = this.l1.get(key);
    if (!entry) {
      this.stats.l1Misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.l1.delete(key);
      this.stats.l1Misses++;
      return undefined;
    }
    // Move to end for LRU ordering
    this.l1.delete(key);
    this.l1.set(key, entry);
    this.stats.l1Hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    // Evict oldest if at capacity
    if (this.l1.size >= this.maxSize && !this.l1.has(key)) {
      const oldest = this.l1.keys().next().value;
      if (oldest !== undefined) {
        this.l1.delete(oldest);
      }
    }
    this.l1.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      key,
    });
  }

  invalidate(key: string): boolean {
    return this.l1.delete(key);
  }

  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern);
    let count = 0;
    for (const key of [...this.l1.keys()]) {
      if (regex.test(key)) {
        this.l1.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.l1.clear();
  }

  // ── L3 stats (external cache layer tracking) ─────────────────

  recordL3Hit(): void {
    this.stats.l3Hits++;
  }

  recordL3Miss(): void {
    this.stats.l3Misses++;
  }

  getStats(): Readonly<CacheStats> {
    return { ...this.stats };
  }

  // ── Static key builders ───────────────────────────────────────

  static propertyKey(zpid: number | string): string {
    return `property:${zpid}`;
  }

  static searchKey(query: string): string {
    return `search:${hashKey(query)}`;
  }

  static marketKey(region: string): string {
    return `market:${hashKey(region)}`;
  }

  static embeddingKey(text: string): string {
    return `embedding:${hashKey(text)}`;
  }

  static userPrefKey(userId: string): string {
    return `userpref:${userId}`;
  }

  static ragKey(query: string): string {
    return `rag:${hashKey(query)}`;
  }

  // ── Static TTL presets (milliseconds) ─────────────────────────

  static readonly TTL = {
    PROPERTY_DATA: 60 * 60 * 1_000, // 1 hour
    MARKET_DATA: 6 * 60 * 60 * 1_000, // 6 hours
    EMBEDDINGS: 60 * 60 * 1_000, // 1 hour
    USER_PREFERENCES: 24 * 60 * 60 * 1_000, // 24 hours
    RAG_RESULTS: 5 * 60 * 1_000, // 5 minutes
    SEARCH_RESULTS: 5 * 60 * 1_000, // 5 minutes
  } as const;
}
