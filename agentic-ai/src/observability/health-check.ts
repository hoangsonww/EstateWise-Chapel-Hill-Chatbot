/**
 * Health-check aggregator that collects component checks and
 * returns an overall system health status.
 *
 * Status logic (using failedCount/totalCount, NOT a simple allOk boolean):
 *   - 0 failed  = healthy
 *   - some failed = degraded
 *   - all failed  = unhealthy
 */

export interface HealthCheckResult {
  name: string;
  healthy: boolean;
  message?: string;
  latencyMs?: number;
}

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: number;
  checks: HealthCheckResult[];
  failedCount: number;
  totalCount: number;
}

export type HealthCheckFn = () => Promise<HealthCheckResult>;

export class HealthCheckAggregator {
  private readonly checks = new Map<string, HealthCheckFn>();

  /**
   * Register a named health check function.
   */
  registerCheck(name: string, checkFn: HealthCheckFn): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Run all registered checks in parallel and return aggregated health.
   */
  async getHealth(): Promise<SystemHealth> {
    const entries = [...this.checks.entries()];
    const results: HealthCheckResult[] = await Promise.all(
      entries.map(async ([name, fn]) => {
        const start = Date.now();
        try {
          const result = await fn();
          return {
            ...result,
            name,
            latencyMs: result.latencyMs ?? Date.now() - start,
          };
        } catch (err) {
          return {
            name,
            healthy: false,
            message: err instanceof Error ? err.message : String(err),
            latencyMs: Date.now() - start,
          };
        }
      }),
    );

    const totalCount = results.length;
    const failedCount = results.filter((r) => !r.healthy).length;

    let status: SystemHealth["status"];
    if (totalCount === 0) {
      status = "healthy";
    } else if (failedCount === totalCount) {
      status = "unhealthy";
    } else if (failedCount > 0) {
      status = "degraded";
    } else {
      status = "healthy";
    }

    return {
      status,
      timestamp: Date.now(),
      checks: results,
      failedCount,
      totalCount,
    };
  }
}
