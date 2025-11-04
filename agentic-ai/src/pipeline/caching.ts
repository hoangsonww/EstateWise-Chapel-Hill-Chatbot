/**
 * Multi-Level Caching System
 *
 * Advanced caching with L1/L2/L3 cache hierarchy, cache invalidation strategies,
 * distributed caching, and intelligent cache warming.
 */

import type { PipelineResult } from './types.js';

/**
 * Cache entry with metadata
 */
export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
  size?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSize: number;
  evictions: number;
}

/**
 * Cache interface
 */
export interface Cache<T = unknown> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
  getStats(): CacheStats;
}

/**
 * In-memory L1 cache (fastest, smallest)
 */
export class L1Cache<T = unknown> implements Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(options?: { maxSize?: number; defaultTTL?: number }) {
    this.maxSize = options?.maxSize || 100;
  }

  async get(key: string): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.value;
  }

  async set(key: string, value: T, ttl = 60000): Promise<void> {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      hits: 0,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses + 1),
      totalEntries: this.cache.size,
      totalSize: 0, // Not tracked for L1
      evictions: this.stats.evictions,
    };
  }

  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const lastAccess = entry.timestamp + (entry.hits * 1000);
      if (lastAccess < lruTime) {
        lruTime = lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.stats.evictions++;
    }
  }
}

/**
 * Redis-backed L2 cache (medium speed, larger)
 */
export class L2Cache<T = unknown> implements Cache<T> {
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(private redisClient?: any) {}

  async get(key: string): Promise<T | null> {
    if (!this.redisClient) {
      this.stats.misses++;
      return null;
    }

    try {
      const data = await this.redisClient.get(key);
      if (!data) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(data);
      if (Date.now() > entry.expiresAt) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      entry.hits++;
      await this.redisClient.set(key, JSON.stringify(entry));
      this.stats.hits++;
      return entry.value;
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }

  async set(key: string, value: T, ttl = 300000): Promise<void> {
    if (!this.redisClient) return;

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      hits: 0,
    };

    await this.redisClient.set(key, JSON.stringify(entry), 'PX', ttl);
  }

  async delete(key: string): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.del(key);
    }
  }

  async clear(): Promise<void> {
    if (this.redisClient) {
      await this.redisClient.flushdb();
    }
  }

  async has(key: string): Promise<boolean> {
    if (!this.redisClient) return false;
    return (await this.redisClient.exists(key)) === 1;
  }

  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses + 1),
      totalEntries: 0,
      totalSize: 0,
      evictions: this.stats.evictions,
    };
  }
}

/**
 * File-based L3 cache (slowest, largest)
 */
export class L3Cache<T = unknown> implements Cache<T> {
  private basePath: string;
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
  };

  constructor(basePath: string = './.cache/l3') {
    this.basePath = basePath;
  }

  async get(key: string): Promise<T | null> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const filePath = path.join(this.basePath, `${this.hashKey(key)}.json`);
      const data = await fs.readFile(filePath, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(data);

      if (Date.now() > entry.expiresAt) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return entry.value;
    } catch {
      this.stats.misses++;
      return null;
    }
  }

  async set(key: string, value: T, ttl = 3600000): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    // Ensure directory exists
    await fs.mkdir(this.basePath, { recursive: true });

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      hits: 0,
    };

    const filePath = path.join(this.basePath, `${this.hashKey(key)}.json`);
    await fs.writeFile(filePath, JSON.stringify(entry), 'utf-8');
  }

  async delete(key: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const filePath = path.join(this.basePath, `${this.hashKey(key)}.json`);
      await fs.unlink(filePath);
    } catch {
      // Ignore errors
    }
  }

  async clear(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const files = await fs.readdir(this.basePath);

      for (const file of files) {
        const path = await import('path');
        await fs.unlink(path.join(this.basePath, file));
      }
    } catch {
      // Ignore errors
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const filePath = path.join(this.basePath, `${this.hashKey(key)}.json`);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses + 1),
      totalEntries: 0,
      totalSize: 0,
      evictions: this.stats.evictions,
    };
  }

  private hashKey(key: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Multi-level cache coordinator
 */
export class MultiLevelCache<T = unknown> implements Cache<T> {
  private l1: L1Cache<T>;
  private l2?: L2Cache<T>;
  private l3?: L3Cache<T>;

  constructor(options?: {
    l1MaxSize?: number;
    redisClient?: any;
    l3BasePath?: string;
  }) {
    this.l1 = new L1Cache({ maxSize: options?.l1MaxSize });
    if (options?.redisClient) {
      this.l2 = new L2Cache(options.redisClient);
    }
    if (options?.l3BasePath) {
      this.l3 = new L3Cache(options.l3BasePath);
    }
  }

  async get(key: string): Promise<T | null> {
    // Try L1 first
    let value = await this.l1.get(key);
    if (value !== null) return value;

    // Try L2
    if (this.l2) {
      value = await this.l2.get(key);
      if (value !== null) {
        // Promote to L1
        await this.l1.set(key, value);
        return value;
      }
    }

    // Try L3
    if (this.l3) {
      value = await this.l3.get(key);
      if (value !== null) {
        // Promote to L2 and L1
        if (this.l2) await this.l2.set(key, value);
        await this.l1.set(key, value);
        return value;
      }
    }

    return null;
  }

  async set(key: string, value: T, ttl?: number): Promise<void> {
    // Set in all levels
    await this.l1.set(key, value, ttl);
    if (this.l2) await this.l2.set(key, value, ttl);
    if (this.l3) await this.l3.set(key, value, ttl);
  }

  async delete(key: string): Promise<void> {
    await this.l1.delete(key);
    if (this.l2) await this.l2.delete(key);
    if (this.l3) await this.l3.delete(key);
  }

  async clear(): Promise<void> {
    await this.l1.clear();
    if (this.l2) await this.l2.clear();
    if (this.l3) await this.l3.clear();
  }

  async has(key: string): Promise<boolean> {
    return (await this.l1.has(key)) ||
           (this.l2 ? await this.l2.has(key) : false) ||
           (this.l3 ? await this.l3.has(key) : false);
  }

  getStats(): CacheStats {
    const l1Stats = this.l1.getStats();
    const l2Stats = this.l2?.getStats();
    const l3Stats = this.l3?.getStats();

    return {
      hits: l1Stats.hits + (l2Stats?.hits || 0) + (l3Stats?.hits || 0),
      misses: l1Stats.misses + (l2Stats?.misses || 0) + (l3Stats?.misses || 0),
      hitRate: 0, // Calculated below
      totalEntries: l1Stats.totalEntries + (l2Stats?.totalEntries || 0) + (l3Stats?.totalEntries || 0),
      totalSize: l1Stats.totalSize + (l2Stats?.totalSize || 0) + (l3Stats?.totalSize || 0),
      evictions: l1Stats.evictions + (l2Stats?.evictions || 0) + (l3Stats?.evictions || 0),
    };
  }

  /**
   * Get detailed stats for each level
   */
  getDetailedStats(): {
    l1: CacheStats;
    l2?: CacheStats;
    l3?: CacheStats;
    overall: CacheStats;
  } {
    const overall = this.getStats();
    overall.hitRate = overall.hits / (overall.hits + overall.misses + 1);

    return {
      l1: this.l1.getStats(),
      l2: this.l2?.getStats(),
      l3: this.l3?.getStats(),
      overall,
    };
  }
}

/**
 * Cache warming strategy
 */
export class CacheWarmer {
  private warmed = new Set<string>();

  /**
   * Warm cache with predicted keys
   */
  async warmCache<T>(
    cache: Cache<T>,
    keys: string[],
    fetcher: (key: string) => Promise<T>
  ): Promise<void> {
    const promises = keys.map(async (key) => {
      if (this.warmed.has(key)) return;

      try {
        const value = await fetcher(key);
        await cache.set(key, value);
        this.warmed.add(key);
      } catch (error) {
        console.error(`Failed to warm cache for ${key}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Reset warmed keys
   */
  reset(): void {
    this.warmed.clear();
  }
}
