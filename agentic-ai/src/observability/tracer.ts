/**
 * Lightweight distributed tracing for agent spans.
 * Each trace contains ordered spans with events, status, and timing.
 */

import { randomUUID } from "node:crypto";

export interface TraceEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface TraceSpan {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  status: "ok" | "error" | "running";
  attributes: Record<string, unknown>;
  events: TraceEvent[];
}

interface Trace {
  traceId: string;
  spans: Map<string, TraceSpan>;
  createdAt: number;
}

export class Tracer {
  private readonly traces = new Map<string, Trace>();

  /**
   * Create a new trace and return its ID.
   */
  createTrace(): string {
    const traceId = randomUUID();
    this.traces.set(traceId, {
      traceId,
      spans: new Map(),
      createdAt: Date.now(),
    });
    return traceId;
  }

  /**
   * Start a new span within an existing trace.
   * Returns the spanId.
   */
  startSpan(
    traceId: string,
    name: string,
    parentSpanId?: string,
    attributes?: Record<string, unknown>,
  ): string {
    const trace = this.traces.get(traceId);
    if (!trace) throw new Error(`Trace ${traceId} not found`);

    const spanId = randomUUID();
    const span: TraceSpan = {
      spanId,
      traceId,
      parentSpanId,
      name,
      startTime: Date.now(),
      status: "running",
      attributes: attributes ?? {},
      events: [],
    };
    trace.spans.set(spanId, span);
    return spanId;
  }

  /**
   * End a span, recording its final status.
   */
  endSpan(
    traceId: string,
    spanId: string,
    status: "ok" | "error" = "ok",
    attributes?: Record<string, unknown>,
  ): void {
    const span = this.getSpan(traceId, spanId);
    if (!span) return;
    span.endTime = Date.now();
    span.status = status;
    if (attributes) {
      Object.assign(span.attributes, attributes);
    }
  }

  /**
   * Add a timestamped event to a span.
   */
  addEvent(
    traceId: string,
    spanId: string,
    name: string,
    attributes?: Record<string, unknown>,
  ): void {
    const span = this.getSpan(traceId, spanId);
    if (!span) return;
    span.events.push({
      name,
      timestamp: Date.now(),
      attributes,
    });
  }

  /**
   * Get all spans for a trace.
   */
  getTrace(traceId: string): TraceSpan[] | undefined {
    const trace = this.traces.get(traceId);
    if (!trace) return undefined;
    return [...trace.spans.values()];
  }

  /**
   * Get a single span by trace and span ID.
   */
  getSpan(traceId: string, spanId: string): TraceSpan | undefined {
    const trace = this.traces.get(traceId);
    if (!trace) return undefined;
    return trace.spans.get(spanId);
  }

  /**
   * Return all trace IDs.
   */
  getAllTraces(): string[] {
    return [...this.traces.keys()];
  }

  /**
   * Remove traces older than maxAgeMs (default 1 hour).
   */
  cleanup(maxAgeMs = 60 * 60 * 1_000): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    for (const [id, trace] of this.traces) {
      if (trace.createdAt < cutoff) {
        this.traces.delete(id);
        removed++;
      }
    }
    return removed;
  }
}
