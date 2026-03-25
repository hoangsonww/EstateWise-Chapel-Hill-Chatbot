/**
 * Complete type system for the EstateWise orchestration engine.
 *
 * Covers error handling, model configuration, agent definitions, task lifecycle,
 * handoff protocol, conversation state, execution planning, circuit breakers,
 * tracing, batching, dead-letter queue, caching, RAG, and cost budgets.
 */

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

/** Enumerates all classifiable error conditions an agent can encounter. */
export enum AgentErrorType {
  RATE_LIMITED = "RATE_LIMITED",
  CONTEXT_OVERFLOW = "CONTEXT_OVERFLOW",
  TOOL_FAILURE = "TOOL_FAILURE",
  HALLUCINATION_DETECTED = "HALLUCINATION_DETECTED",
  TIMEOUT = "TIMEOUT",
  MODEL_REFUSAL = "MODEL_REFUSAL",
  INVALID_OUTPUT = "INVALID_OUTPUT",
  SCHEMA_VALIDATION_FAILED = "SCHEMA_VALIDATION_FAILED",
  DEPENDENCY_FAILURE = "DEPENDENCY_FAILURE",
  BUDGET_EXCEEDED = "BUDGET_EXCEEDED",
  CIRCULAR_HANDOFF = "CIRCULAR_HANDOFF",
  MAX_ITERATIONS_EXCEEDED = "MAX_ITERATIONS_EXCEEDED",
  EXTERNAL_API_FAILURE = "EXTERNAL_API_FAILURE",
}

/** Structured error thrown by agents and the orchestration layer. */
export class AgentError extends Error {
  public readonly type: AgentErrorType;
  public readonly agentId: string;
  public readonly recoverable: boolean;
  public readonly metadata: Record<string, unknown>;
  public readonly cause?: Error;

  constructor(params: {
    type: AgentErrorType;
    message: string;
    agentId: string;
    recoverable?: boolean;
    metadata?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(params.message);
    this.name = "AgentError";
    this.type = params.type;
    this.agentId = params.agentId;
    this.recoverable = params.recoverable ?? true;
    this.metadata = params.metadata ?? {};
    this.cause = params.cause;
  }

  /** Serialize for structured logging. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      agentId: this.agentId,
      recoverable: this.recoverable,
      metadata: this.metadata,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}

// ---------------------------------------------------------------------------
// Model Configuration
// ---------------------------------------------------------------------------

/** Supported model tiers. */
export type ModelId = "opus" | "sonnet" | "haiku";

/** Per-model configuration including API name and cost rates. */
export interface ModelConfig {
  apiModelId: string;
  contextWindow: number;
  maxOutput: number;
  inputCostPer1M: number;
  outputCostPer1M: number;
  cacheCostPer1M: number;
  supportsExtendedThinking: boolean;
  supportsCaching: boolean;
}

/** Pricing and capability table for every supported model tier. */
export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  opus: {
    apiModelId: "claude-opus-4-20250514",
    contextWindow: 200_000,
    maxOutput: 32_000,
    inputCostPer1M: 15,
    outputCostPer1M: 75,
    cacheCostPer1M: 1.875,
    supportsExtendedThinking: true,
    supportsCaching: true,
  },
  sonnet: {
    apiModelId: "claude-sonnet-4-20250514",
    contextWindow: 200_000,
    maxOutput: 16_000,
    inputCostPer1M: 3,
    outputCostPer1M: 15,
    cacheCostPer1M: 0.375,
    supportsExtendedThinking: true,
    supportsCaching: true,
  },
  haiku: {
    apiModelId: "claude-haiku-4-5-20251001",
    contextWindow: 200_000,
    maxOutput: 8_192,
    inputCostPer1M: 0.8,
    outputCostPer1M: 4,
    cacheCostPer1M: 0.1,
    supportsExtendedThinking: false,
    supportsCaching: true,
  },
};

// ---------------------------------------------------------------------------
// Retry Policy
// ---------------------------------------------------------------------------

/** Configures automatic retry behavior for transient failures. */
export interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: AgentErrorType[];
}

/** Sensible defaults for production retry logic. */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  baseDelayMs: 1_000,
  maxDelayMs: 30_000,
  backoffMultiplier: 2,
  retryableErrors: [
    AgentErrorType.RATE_LIMITED,
    AgentErrorType.TIMEOUT,
    AgentErrorType.EXTERNAL_API_FAILURE,
    AgentErrorType.TOOL_FAILURE,
  ],
};

// ---------------------------------------------------------------------------
// Intent Parameters
// ---------------------------------------------------------------------------

/** Priority declarations for an agent or task. */
export interface IntentParameters {
  priorities: string[];
  tradeoffRules: TradeoffRule[];
  escalationThresholds: EscalationThreshold[];
  qualityGates: QualityGate[];
}

/** Declares a design tradeoff the agent should follow. */
export interface TradeoffRule {
  name: string;
  prefer: string;
  over: string;
  rationale: string;
}

/** Declares when to escalate a situation. */
export interface EscalationThreshold {
  condition: string;
  metric: string;
  threshold: number;
  escalateTo: string;
}

/** A named quality gate with a check description and failure action. */
export interface QualityGate {
  name: string;
  check: string;
  failAction: "block" | "warn" | "retry" | "degrade";
}

// ---------------------------------------------------------------------------
// Cost Tier & Agent Definition
// ---------------------------------------------------------------------------

/** Classifies cost intensity for routing decisions. */
export type CostTier = "low" | "medium" | "high" | "premium";

/** Full specification of a registered agent. */
export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  modelId: ModelId;
  systemPrompt: string;
  capabilities: string[];
  tools: string[];
  costTier: CostTier;
  maxTokenBudget: number;
  retryPolicy: RetryPolicy;
  fallbackAgentId?: string;
  intentParameters: IntentParameters;
  timeoutMs: number;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Task Lifecycle
// ---------------------------------------------------------------------------

/** Progress states for a tracked task. */
export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "retrying";

/** Metadata about a task's execution lifecycle. */
export interface TaskMetadata {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  attempt: number;
  parentTaskId?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  errorType?: AgentErrorType;
  errorMessage?: string;
}

/** Result returned by an agent after processing a task. */
export interface TaskResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: AgentError;
  metadata: TaskMetadata;
  toolCalls: ToolCallRecord[];
  traceSpanId?: string;
}

/** Record of a single tool invocation during a task. */
export interface ToolCallRecord {
  toolName: string;
  input: Record<string, unknown>;
  output?: unknown;
  error?: string;
  durationMs: number;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Handoff Protocol
// ---------------------------------------------------------------------------

/** Classification of handoff reasons. */
export type HandoffType =
  | "delegation"
  | "escalation"
  | "fallback"
  | "specialization"
  | "review";

/** Payload exchanged when handing off between agents. */
export interface HandoffPayload {
  type: HandoffType;
  fromAgentId: string;
  toAgentId: string;
  taskDescription: string;
  context: Record<string, unknown>;
  conversationHistory: ConversationMessage[];
  constraints: string[];
  depth: number;
  chainId: string;
  parentSpanId?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Conversation State
// ---------------------------------------------------------------------------

/** Roles that can author a conversation message. */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/** A single message in a conversation thread. */
export interface ConversationMessage {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    input: Record<string, unknown>;
  }>;
  timestamp: number;
  tokenCount?: number;
}

/** Snapshot of a running conversation, including extracted entities and preferences. */
export interface ConversationState {
  messages: ConversationMessage[];
  totalTokens: number;
  maxTokens: number;
  entities: TrackedEntity[];
  userPreferences: UserPreferences;
  turnCount: number;
  lastActivityAt: number;
}

/** An entity extracted from conversation (e.g., a property address). */
export interface TrackedEntity {
  type: "location" | "property" | "price" | "feature" | "person" | "date";
  value: string;
  confidence: number;
  firstMentionedAt: number;
  lastMentionedAt: number;
  mentionCount: number;
}

/** User preferences inferred from conversation history. */
export interface UserPreferences {
  preferredLocations: string[];
  budgetRange?: { min: number; max: number };
  propertyTypes: string[];
  mustHaveFeatures: string[];
  niceToHaveFeatures: string[];
  dealBreakers: string[];
}

// ---------------------------------------------------------------------------
// Execution Planning
// ---------------------------------------------------------------------------

/** Determines whether a request needs a full agentic loop. */
export type ExecutionMode = "single_turn" | "agentic";

/** A single step in an execution plan DAG. */
export interface ExecutionStep {
  stepId: string;
  agentId: string;
  taskDescription: string;
  dependencies: string[];
  estimatedCostUsd: number;
  estimatedDurationMs: number;
  priority: number;
  optional: boolean;
  status: TaskStatus;
  result?: TaskResult;
}

/** A DAG of steps to fulfill a classified intent. */
export interface ExecutionPlan {
  planId: string;
  intent: string;
  mode: ExecutionMode;
  steps: ExecutionStep[];
  totalEstimatedCostUsd: number;
  totalEstimatedDurationMs: number;
  createdAt: number;
  budgetLimitUsd?: number;
}

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------

/** Standard circuit breaker states. */
export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

/** Configuration for a per-agent circuit breaker. */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
  monitorWindowMs: number;
}

/** Sensible defaults for the circuit breaker. */
export const DEFAULT_CIRCUIT_BREAKER: CircuitBreakerConfig = {
  failureThreshold: 3,
  resetTimeoutMs: 60_000,
  halfOpenMaxAttempts: 1,
  monitorWindowMs: 120_000,
};

// ---------------------------------------------------------------------------
// Tracing / Observability
// ---------------------------------------------------------------------------

/** A single event within a trace span. */
export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes: Record<string, unknown>;
}

/** Distributed-tracing-style span for a unit of orchestration work. */
export interface TraceSpan {
  spanId: string;
  parentSpanId?: string;
  traceId: string;
  operationName: string;
  agentId?: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: "ok" | "error" | "timeout";
  events: SpanEvent[];
  attributes: Record<string, unknown>;
  children: TraceSpan[];
}

/** Running performance metrics for an agent. */
export interface AgentMetrics {
  agentId: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  averageLatencyMs: number;
  averageCostUsd: number;
  p95LatencyMs: number;
  lastRequestAt: number;
  circuitBreakerState: CircuitBreakerState;
  errorRatePercent: number;
  uptimePercent: number;
}

// ---------------------------------------------------------------------------
// Batch Processing
// ---------------------------------------------------------------------------

/** Status of a batch job. */
export type BatchStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

/** A single item within a batch job. */
export interface BatchItem<T = unknown> {
  itemId: string;
  input: string;
  status: TaskStatus;
  result?: TaskResult<T>;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

/** A batch job comprising many items. */
export interface BatchJob<T = unknown> {
  jobId: string;
  status: BatchStatus;
  items: BatchItem<T>[];
  concurrency: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: { completed: number; failed: number; total: number };
}

// ---------------------------------------------------------------------------
// Dead Letter Queue
// ---------------------------------------------------------------------------

/** An entry in the dead-letter queue for tasks that exhausted recovery. */
export interface DeadLetterEntry {
  entryId: string;
  taskId: string;
  agentId: string;
  input: string;
  error: AgentError;
  attempts: number;
  firstFailedAt: number;
  lastFailedAt: number;
  replayable: boolean;
  markedForReplay: boolean;
  metadata: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/** A time-bounded cache entry with access tracking. */
export interface CacheEntry<T> {
  key: string;
  value: T;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
  sizeBytes: number;
}

/** Aggregate cache statistics. */
export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalEntries: number;
  totalSizeBytes: number;
  hitRatePercent: number;
}

// ---------------------------------------------------------------------------
// RAG
// ---------------------------------------------------------------------------

/** A single retrieval-augmented-generation result. */
export interface RAGResult {
  content: string;
  source: string;
  relevanceScore: number;
  metadata: Record<string, unknown>;
}

/** Assembled RAG context ready for prompt injection. */
export interface RAGContext {
  results: RAGResult[];
  query: string;
  totalResults: number;
  retrievalDurationMs: number;
  tokenCount: number;
}

// ---------------------------------------------------------------------------
// Cost Budget
// ---------------------------------------------------------------------------

/** Alert levels for approaching or exceeding a cost budget. */
export type BudgetAlertLevel = "none" | "warning" | "critical" | "exceeded";

/** Budget constraints for a single session or daily window. */
export interface CostBudget {
  dailyLimitUsd: number;
  sessionLimitUsd: number;
  perRequestLimitUsd: number;
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
  currentDailySpendUsd: number;
  currentSessionSpendUsd: number;
  lastResetAt: number;
}
