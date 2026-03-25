/**
 * EstateWise MCP Health Checker
 *
 * Each domain server registers async health checks.  getStatus() runs all
 * checks and returns a composite health status:
 *   - healthy   – every check passed
 *   - degraded  – some checks failed but not all
 *   - unhealthy – every check failed
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HealthState = "healthy" | "degraded" | "unhealthy";

export interface CheckResult {
  name: string;
  healthy: boolean;
  message?: string;
  latencyMs?: number;
}

export interface HealthStatus {
  status: HealthState;
  checks: CheckResult[];
  failedCount: number;
  totalCount: number;
  timestamp: string;
}

type HealthCheckFn = () => Promise<CheckResult>;

// ---------------------------------------------------------------------------
// HealthChecker class
// ---------------------------------------------------------------------------

export class HealthChecker {
  private readonly checks: Map<string, HealthCheckFn> = new Map();

  /**
   * Register a named health check.
   *
   * @param name  Unique check identifier (e.g. 'backend-api').
   * @param fn    Async function that returns a CheckResult.
   */
  registerCheck(name: string, fn: HealthCheckFn): void {
    this.checks.set(name, fn);
  }

  /**
   * Run all registered checks and return a composite status.
   */
  async getStatus(): Promise<HealthStatus> {
    const results: CheckResult[] = [];

    for (const [name, fn] of this.checks) {
      try {
        const start = Date.now();
        const result = await fn();
        result.latencyMs = result.latencyMs ?? Date.now() - start;
        results.push(result);
      } catch (err) {
        results.push({
          name,
          healthy: false,
          message:
            err instanceof Error ? err.message : "Health check threw an error",
        });
      }
    }

    const totalCount = results.length;
    const failedCount = results.filter((r) => !r.healthy).length;

    let status: HealthState;
    if (totalCount === 0 || failedCount === 0) {
      status = "healthy";
    } else if (failedCount === totalCount) {
      status = "unhealthy";
    } else {
      status = "degraded";
    }

    return {
      status,
      checks: results,
      failedCount,
      totalCount,
      timestamp: new Date().toISOString(),
    };
  }
}
