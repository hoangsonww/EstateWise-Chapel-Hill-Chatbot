/**
 * Lightweight metrics registry with Counter, Histogram, and Gauge types.
 * Pre-registers standard EstateWise agent metrics.
 */

// ── Metric types (private implementations) ──────────────────────

interface MetricValue {
  type: "counter" | "histogram" | "gauge";
  name: string;
  description: string;
  value: unknown;
}

class Counter {
  readonly type = "counter" as const;
  private count = 0;

  constructor(
    readonly name: string,
    readonly description: string,
  ) {}

  inc(amount = 1): void {
    this.count += amount;
  }

  get(): number {
    return this.count;
  }

  reset(): void {
    this.count = 0;
  }

  toJSON(): MetricValue {
    return { type: this.type, name: this.name, description: this.description, value: this.count };
  }
}

class Histogram {
  readonly type = "histogram" as const;
  private values: number[] = [];
  private sum = 0;
  private count = 0;

  constructor(
    readonly name: string,
    readonly description: string,
    readonly buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  ) {}

  observe(value: number): void {
    this.values.push(value);
    this.sum += value;
    this.count++;
  }

  getSum(): number {
    return this.sum;
  }

  getCount(): number {
    return this.count;
  }

  getMean(): number {
    return this.count === 0 ? 0 : this.sum / this.count;
  }

  getPercentile(p: number): number {
    if (this.values.length === 0) return 0;
    const sorted = [...this.values].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  reset(): void {
    this.values = [];
    this.sum = 0;
    this.count = 0;
  }

  toJSON(): MetricValue {
    return {
      type: this.type,
      name: this.name,
      description: this.description,
      value: {
        count: this.count,
        sum: this.sum,
        mean: this.getMean(),
        p50: this.getPercentile(50),
        p95: this.getPercentile(95),
        p99: this.getPercentile(99),
      },
    };
  }
}

class Gauge {
  readonly type = "gauge" as const;
  private current = 0;

  constructor(
    readonly name: string,
    readonly description: string,
  ) {}

  set(value: number): void {
    this.current = value;
  }

  inc(amount = 1): void {
    this.current += amount;
  }

  dec(amount = 1): void {
    this.current -= amount;
  }

  get(): number {
    return this.current;
  }

  toJSON(): MetricValue {
    return { type: this.type, name: this.name, description: this.description, value: this.current };
  }
}

// ── Registry ────────────────────────────────────────────────────

export type { Counter, Histogram, Gauge };

export class MetricsRegistry {
  private readonly counters = new Map<string, Counter>();
  private readonly histograms = new Map<string, Histogram>();
  private readonly gauges = new Map<string, Gauge>();

  /**
   * Create or retrieve a counter metric.
   */
  counter(name: string, description = ""): Counter {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Counter(name, description));
    }
    return this.counters.get(name)!;
  }

  /**
   * Create or retrieve a histogram metric.
   */
  histogram(name: string, description = "", buckets?: number[]): Histogram {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, new Histogram(name, description, buckets));
    }
    return this.histograms.get(name)!;
  }

  /**
   * Create or retrieve a gauge metric.
   */
  gauge(name: string, description = ""): Gauge {
    if (!this.gauges.has(name)) {
      this.gauges.set(name, new Gauge(name, description));
    }
    return this.gauges.get(name)!;
  }

  /**
   * Export all metrics as a JSON-serializable structure.
   */
  getAll(): MetricValue[] {
    const result: MetricValue[] = [];
    for (const c of this.counters.values()) result.push(c.toJSON());
    for (const h of this.histograms.values()) result.push(h.toJSON());
    for (const g of this.gauges.values()) result.push(g.toJSON());
    return result;
  }
}

// ── Pre-registered standard metrics ─────────────────────────────

export function createStandardMetrics(registry: MetricsRegistry) {
  return {
    agentRequestDuration: registry.histogram(
      "agent_request_duration_seconds",
      "Duration of agent request processing",
    ),
    tokensConsumedTotal: registry.counter(
      "tokens_consumed_total",
      "Total tokens consumed across all models",
    ),
    agentErrorsTotal: registry.counter(
      "agent_errors_total",
      "Total number of agent errors",
    ),
    toolCallsTotal: registry.counter(
      "tool_calls_total",
      "Total number of tool invocations",
    ),
    costUsdTotal: registry.counter(
      "cost_usd_total",
      "Cumulative cost in USD",
    ),
    cacheHitRatio: registry.gauge(
      "cache_hit_ratio",
      "Current cache hit ratio (0-1)",
    ),
    schemaValidationPassRate: registry.gauge(
      "schema_validation_pass_rate",
      "Fraction of schema validations that pass (0-1)",
    ),
    groundingViolationRate: registry.gauge(
      "grounding_violation_rate",
      "Rate of grounding/hallucination violations (0-1)",
    ),
    dailyBudgetUtilization: registry.gauge(
      "daily_budget_utilization",
      "Fraction of daily cost budget consumed (0-1)",
    ),
  };
}
