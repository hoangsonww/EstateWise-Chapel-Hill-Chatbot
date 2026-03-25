/**
 * EstateWise MCP Rate Limiter
 *
 * Token-bucket implementation that gates tool calls per server.
 * getRateLimiter() returns a singleton per serverId so all callers
 * share the same bucket.
 */

// ---------------------------------------------------------------------------
// Token bucket
// ---------------------------------------------------------------------------

export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per millisecond
  private lastRefill: number;

  /**
   * @param maxPerMinute  Maximum burst size / sustained calls per minute.
   */
  constructor(maxPerMinute: number) {
    this.maxTokens = maxPerMinute;
    this.tokens = maxPerMinute;
    this.refillRate = maxPerMinute / 60_000; // tokens per ms
    this.lastRefill = Date.now();
  }

  /** Refill tokens based on elapsed time. */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate,
    );
    this.lastRefill = now;
  }

  /**
   * Attempt to consume one token.
   *
   * @returns `true` if the call is allowed, `false` if rate-limited.
   */
  tryConsume(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Time in milliseconds until the next token is available.
   *
   * @returns 0 if a token is available now, otherwise ms to wait.
   */
  waitTime(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    const deficit = 1 - this.tokens;
    return Math.ceil(deficit / this.refillRate);
  }
}

// ---------------------------------------------------------------------------
// Singleton factory keyed by server ID
// ---------------------------------------------------------------------------

const limiters = new Map<string, RateLimiter>();

/**
 * Get or create a RateLimiter for the given server.
 *
 * @param serverId        Unique server identifier.
 * @param maxPerMinute    Max calls per minute (used only on first creation).
 */
export function getRateLimiter(
  serverId: string,
  maxPerMinute: number = 60,
): RateLimiter {
  let limiter = limiters.get(serverId);
  if (!limiter) {
    limiter = new RateLimiter(maxPerMinute);
    limiters.set(serverId, limiter);
  }
  return limiter;
}
