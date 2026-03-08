export type AgentRuntime = "default" | "langgraph" | "crewai";

export type A2ATaskStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "canceled";

export interface A2ATaskInput {
  goal: string;
  runtime: AgentRuntime;
  rounds: number;
  threadId?: string;
  requestId?: string;
}

export interface A2ATaskError {
  message: string;
}

export interface A2ATaskRecord {
  id: string;
  status: A2ATaskStatus;
  input: A2ATaskInput;
  output?: unknown;
  error?: A2ATaskError;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
}

export type A2ATaskEventType =
  | "created"
  | "started"
  | "updated"
  | "succeeded"
  | "failed"
  | "canceled";

export interface A2ATaskEvent {
  type: A2ATaskEventType;
  at: string;
  task: A2ATaskRecord;
}

export interface A2AAgentCard {
  protocol: "a2a";
  version: "0.1";
  id: string;
  name: string;
  description: string;
  url: string;
  endpoints: {
    rpc: string;
    card: string;
    taskEvents: string;
  };
  capabilities: {
    taskManagement: true;
    streaming: true;
    runtimes: AgentRuntime[];
  };
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcSuccess {
  jsonrpc: "2.0";
  id: string | number | null;
  result: unknown;
}

export interface JsonRpcFailure {
  jsonrpc: "2.0";
  id: string | number | null;
  error: JsonRpcError;
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcFailure;
