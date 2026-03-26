/**
 * Hybrid RAG pipeline supporting vector, graph, and keyword search
 * with Reciprocal Rank Fusion (RRF) for result merging.
 */

export interface RAGSource {
  type: "vector" | "graph" | "keyword";
  content: string;
  score: number;
  metadata: Record<string, unknown>;
  tokenCount: number;
}

export interface RAGConfig {
  maxResults?: number;
  minScore?: number;
  tokenBudget?: number;
  cacheTtlMs?: number;
  rrfK?: number;
}

export type SearchFn = (query: string) => Promise<RAGSource[]>;

interface CacheEntry {
  results: RAGSource[];
  timestamp: number;
}

const DEFAULT_RAG_CONFIG: Required<RAGConfig> = {
  maxResults: 10,
  minScore: 0.1,
  tokenBudget: 4_000,
  cacheTtlMs: 5 * 60 * 1_000,
  rsfK: 60,
  get rrfK() {
    return 60;
  },
} as unknown as Required<RAGConfig>;

export class HybridRAGPipeline {
  private readonly config: Required<RAGConfig>;
  private readonly vectorSearch?: SearchFn;
  private readonly graphSearch?: SearchFn;
  private readonly keywordSearch?: SearchFn;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    config?: RAGConfig,
    vectorSearch?: SearchFn,
    graphSearch?: SearchFn,
    keywordSearch?: SearchFn,
  ) {
    this.config = {
      maxResults: config?.maxResults ?? 10,
      minScore: config?.minScore ?? 0.1,
      tokenBudget: config?.tokenBudget ?? 4_000,
      cacheTtlMs: config?.cacheTtlMs ?? 5 * 60 * 1_000,
      rrfK: config?.rrfK ?? 60,
    };
    this.vectorSearch = vectorSearch;
    this.graphSearch = graphSearch;
    this.keywordSearch = keywordSearch;
  }

  /**
   * Retrieve results from all configured sources in parallel,
   * fuse with RRF, filter by minimum score, trim to token budget,
   * and cache for 5 minutes.
   */
  async retrieve(query: string): Promise<RAGSource[]> {
    const cached = this.getFromCache(query);
    if (cached) return cached;

    const searches: Promise<RAGSource[]>[] = [];
    if (this.vectorSearch)
      searches.push(this.vectorSearch(query).catch(() => []));
    if (this.graphSearch)
      searches.push(this.graphSearch(query).catch(() => []));
    if (this.keywordSearch)
      searches.push(this.keywordSearch(query).catch(() => []));

    if (searches.length === 0) return [];

    const allResults = await Promise.all(searches);
    const fused = this.reciprocalRankFusion(allResults);

    const filtered = fused.filter((r) => r.score >= this.config.minScore);
    const trimmed = this.trimToTokenBudget(filtered, this.config.tokenBudget);
    const limited = trimmed.slice(0, this.config.maxResults);

    this.addToCache(query, limited);
    return limited;
  }

  /**
   * Format RAG results as XML for injection into a prompt.
   */
  formatAsXml(sources: RAGSource[]): string {
    if (sources.length === 0) return "<rag-context />";
    const entries = sources
      .map(
        (s, i) =>
          `  <source index="${i}" type="${s.type}" score="${s.score.toFixed(3)}" tokens="${s.tokenCount}">\n    ${s.content}\n  </source>`,
      )
      .join("\n");
    return `<rag-context>\n${entries}\n</rag-context>`;
  }

  /**
   * Reciprocal Rank Fusion across multiple ranked lists.
   * RRF(d) = SUM(1 / (k + rank_i(d))) for each list i.
   */
  private reciprocalRankFusion(lists: RAGSource[][]): RAGSource[] {
    const k = this.config.rrfK;
    const scoreMap = new Map<string, { source: RAGSource; rrfScore: number }>();

    for (const list of lists) {
      for (let rank = 0; rank < list.length; rank++) {
        const source = list[rank];
        const key = `${source.type}:${source.content.slice(0, 100)}`;
        const existing = scoreMap.get(key);
        const contribution = 1 / (k + rank + 1);

        if (existing) {
          existing.rrfScore += contribution;
          if (source.score > existing.source.score) {
            existing.source = source;
          }
        } else {
          scoreMap.set(key, { source, rrfScore: contribution });
        }
      }
    }

    return Array.from(scoreMap.values())
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .map((entry) => ({ ...entry.source, score: entry.rrfScore }));
  }

  /**
   * Trim results to fit within a token budget, keeping highest-scored first.
   */
  private trimToTokenBudget(sources: RAGSource[], budget: number): RAGSource[] {
    const result: RAGSource[] = [];
    let used = 0;

    for (const source of sources) {
      if (used + source.tokenCount > budget) break;
      result.push(source);
      used += source.tokenCount;
    }

    return result;
  }

  private getFromCache(query: string): RAGSource[] | undefined {
    const entry = this.cache.get(query);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > this.config.cacheTtlMs) {
      this.cache.delete(query);
      return undefined;
    }
    return entry.results;
  }

  private addToCache(query: string, results: RAGSource[]): void {
    this.cache.set(query, { results, timestamp: Date.now() });
  }
}
