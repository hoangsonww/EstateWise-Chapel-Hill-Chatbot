import { config } from "./config.js";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

function write(level: LogLevel, args: any[]) {
  const ts = new Date().toISOString();
  // MCP stdio servers must not write to stdout.
  // eslint-disable-next-line no-console
  console.error(`[MCP][${level}][${ts}]`, ...args);
}

/** Log debug messages when MCP_DEBUG=true. */
export function debug(...args: any[]) {
  if (config.debug) {
    write("DEBUG", args);
  }
}

export function info(...args: any[]) {
  write("INFO", args);
}

export function warn(...args: any[]) {
  write("WARN", args);
}

export function error(...args: any[]) {
  write("ERROR", args);
}
