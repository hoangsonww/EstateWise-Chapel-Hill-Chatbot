/**
 * EstateWise MCP Logger
 *
 * Structured JSON logger with an in-memory audit trail (capped at 10 000
 * entries). Each domain server creates its own logger via createLogger().
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LogLevel = "debug" | "info" | "warn" | "error" | "audit";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
  data?: unknown;
}

interface AuditEntry {
  timestamp: string;
  source: string;
  action: string;
  agentId?: string;
  toolName?: string;
  success?: boolean;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  audit(entry: Omit<AuditEntry, "timestamp" | "source">): void;
}

// ---------------------------------------------------------------------------
// Audit trail (shared, capped)
// ---------------------------------------------------------------------------

const AUDIT_CAP = 10_000;
const auditTrail: AuditEntry[] = [];

function pushAudit(entry: AuditEntry): void {
  auditTrail.push(entry);
  if (auditTrail.length > AUDIT_CAP) {
    auditTrail.splice(0, auditTrail.length - AUDIT_CAP);
  }
}

/**
 * Return a copy of the current audit log (newest last).
 *
 * @param limit  Maximum entries to return (default: all).
 */
export function getAuditLog(limit?: number): AuditEntry[] {
  if (limit !== undefined && limit > 0) {
    return auditTrail.slice(-limit);
  }
  return [...auditTrail];
}

// ---------------------------------------------------------------------------
// Logger factory
// ---------------------------------------------------------------------------

function emit(entry: LogEntry): void {
  const line = JSON.stringify(entry);
  switch (entry.level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    case "debug":
      console.debug(line);
      break;
    default:
      console.log(line);
  }
}

/**
 * Create a structured logger bound to a named source (server / module).
 *
 * @param source  Identifier that appears in every log line (e.g. 'property-db').
 */
export function createLogger(source: string): Logger {
  const log = (level: LogLevel, message: string, data?: unknown) => {
    emit({
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      ...(data !== undefined ? { data } : {}),
    });
  };

  return {
    debug: (msg, data?) => log("debug", msg, data),
    info: (msg, data?) => log("info", msg, data),
    warn: (msg, data?) => log("warn", msg, data),
    error: (msg, data?) => log("error", msg, data),
    audit: (entry) => {
      const full: AuditEntry = {
        timestamp: new Date().toISOString(),
        source,
        ...entry,
      };
      pushAudit(full);
      log("audit", `AUDIT: ${entry.action}`, entry);
    },
  };
}
