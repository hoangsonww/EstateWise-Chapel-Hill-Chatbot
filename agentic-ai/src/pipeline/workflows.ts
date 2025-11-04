/**
 * Human-in-the-Loop and Approval Workflows
 *
 * Interactive workflows with human approval gates, notifications,
 * timeout handling, and decision routing.
 */

import { EventEmitter } from 'events';
import type { PipelineStage, PipelineContext, StageResult } from './types.js';
import { Stage } from './Stage.js';

/**
 * Approval request
 */
export interface ApprovalRequest {
  id: string;
  context: PipelineContext;
  stageName: string;
  requestedAt: number;
  requestedBy?: string;
  timeout?: number;
  data: unknown;
  message?: string;
}

/**
 * Approval response
 */
export interface ApprovalResponse {
  requestId: string;
  approved: boolean;
  approvedBy?: string;
  approvedAt: number;
  reason?: string;
  modifications?: Record<string, unknown>;
}

/**
 * Approval gate configuration
 */
export interface ApprovalGateConfig {
  stageName: string;
  requiresApproval: (context: PipelineContext) => Promise<boolean> | boolean;
  approvalMessage?: string | ((context: PipelineContext) => string);
  timeout?: number;
  onTimeout?: 'approve' | 'reject' | 'retry';
  approvers?: string[];
  minApprovals?: number;
}

/**
 * Approval manager
 */
export class ApprovalManager extends EventEmitter {
  private pendingRequests = new Map<string, ApprovalRequest>();
  private responses = new Map<string, ApprovalResponse>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Create an approval request
   */
  async createRequest(
    config: ApprovalGateConfig,
    context: PipelineContext,
    data: unknown
  ): Promise<ApprovalResponse> {
    const request: ApprovalRequest = {
      id: `approval-${Date.now()}-${Math.random()}`,
      context,
      stageName: config.stageName,
      requestedAt: Date.now(),
      timeout: config.timeout,
      data,
      message: typeof config.approvalMessage === 'function'
        ? config.approvalMessage(context)
        : config.approvalMessage,
    };

    this.pendingRequests.set(request.id, request);
    this.emit('approval-requested', request);

    return new Promise((resolve, reject) => {
      // Set timeout if configured
      if (config.timeout) {
        const timer = setTimeout(() => {
          this.handleTimeout(request.id, config.onTimeout || 'reject', resolve, reject);
        }, config.timeout);

        this.timeouts.set(request.id, timer);
      }

      // Listen for response
      const onResponse = (response: ApprovalResponse) => {
        if (response.requestId === request.id) {
          const timer = this.timeouts.get(request.id);
          if (timer) clearTimeout(timer);

          this.off('approval-response', onResponse);
          this.pendingRequests.delete(request.id);
          this.responses.set(response.requestId, response);

          resolve(response);
        }
      };

      this.on('approval-response', onResponse);
    });
  }

  /**
   * Respond to an approval request
   */
  respond(response: ApprovalResponse): void {
    const request = this.pendingRequests.get(response.requestId);
    if (!request) {
      throw new Error(`Approval request ${response.requestId} not found`);
    }

    response.approvedAt = Date.now();
    this.emit('approval-response', response);
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.pendingRequests.values());
  }

  /**
   * Get request by ID
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.pendingRequests.get(requestId);
  }

  /**
   * Cancel a request
   */
  cancel(requestId: string): void {
    const timer = this.timeouts.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(requestId);
    }

    this.pendingRequests.delete(requestId);
    this.emit('approval-cancelled', requestId);
  }

  private handleTimeout(
    requestId: string,
    action: 'approve' | 'reject' | 'retry',
    resolve: (response: ApprovalResponse) => void,
    reject: (error: Error) => void
  ): void {
    const response: ApprovalResponse = {
      requestId,
      approved: action === 'approve',
      approvedAt: Date.now(),
      reason: 'Timeout',
    };

    if (action === 'retry') {
      reject(new Error('Approval timeout - retry'));
    } else {
      this.emit('approval-timeout', { requestId, action });
      this.emit('approval-response', response);
    }
  }
}

/**
 * Approval gate stage
 */
export class ApprovalGateStage extends Stage {
  constructor(
    private config: ApprovalGateConfig,
    private approvalManager: ApprovalManager
  ) {
    super({
      name: `approval-${config.stageName}`,
      description: `Approval gate for ${config.stageName}`,
      execute: async (context) => {
        // Check if approval is required
        const requiresApproval = await config.requiresApproval(context);

        if (!requiresApproval) {
          return { approved: false, skipped: true };
        }

        // Request approval
        const response = await approvalManager.createRequest(
          config,
          context,
          context.state
        );

        if (!response.approved) {
          throw new Error(response.reason || 'Approval rejected');
        }

        // Apply modifications if provided
        if (response.modifications) {
          Object.assign(context.state, response.modifications);
        }

        return { approved: true, response };
      },
      timeout: config.timeout,
    });
  }
}

/**
 * User input stage
 */
export interface UserInputConfig {
  stageName: string;
  prompt: string | ((context: PipelineContext) => string);
  fields: Array<{
    name: string;
    type: 'text' | 'number' | 'boolean' | 'select';
    label?: string;
    required?: boolean;
    options?: string[];
    default?: unknown;
    validate?: (value: unknown) => boolean | string;
  }>;
  timeout?: number;
}

/**
 * User input request
 */
export interface UserInputRequest {
  id: string;
  config: UserInputConfig;
  context: PipelineContext;
  requestedAt: number;
}

/**
 * User input response
 */
export interface UserInputResponse {
  requestId: string;
  values: Record<string, unknown>;
  submittedAt: number;
}

/**
 * User input manager
 */
export class UserInputManager extends EventEmitter {
  private pendingInputs = new Map<string, UserInputRequest>();

  /**
   * Request user input
   */
  async requestInput(
    config: UserInputConfig,
    context: PipelineContext
  ): Promise<UserInputResponse> {
    const request: UserInputRequest = {
      id: `input-${Date.now()}-${Math.random()}`,
      config,
      context,
      requestedAt: Date.now(),
    };

    this.pendingInputs.set(request.id, request);
    this.emit('input-requested', request);

    return new Promise((resolve, reject) => {
      // Set timeout if configured
      if (config.timeout) {
        setTimeout(() => {
          reject(new Error('User input timeout'));
          this.pendingInputs.delete(request.id);
        }, config.timeout);
      }

      // Listen for response
      const onResponse = (response: UserInputResponse) => {
        if (response.requestId === request.id) {
          this.off('input-response', onResponse);
          this.pendingInputs.delete(request.id);
          resolve(response);
        }
      };

      this.on('input-response', onResponse);
    });
  }

  /**
   * Submit user input
   */
  submitInput(response: UserInputResponse): void {
    const request = this.pendingInputs.get(response.requestId);
    if (!request) {
      throw new Error(`Input request ${response.requestId} not found`);
    }

    // Validate input
    for (const field of request.config.fields) {
      const value = response.values[field.name];

      if (field.required && value === undefined) {
        throw new Error(`Field ${field.name} is required`);
      }

      if (field.validate && value !== undefined) {
        const result = field.validate(value);
        if (typeof result === 'string') {
          throw new Error(result);
        }
        if (!result) {
          throw new Error(`Validation failed for field ${field.name}`);
        }
      }
    }

    response.submittedAt = Date.now();
    this.emit('input-response', response);
  }

  /**
   * Get pending inputs
   */
  getPendingInputs(): UserInputRequest[] {
    return Array.from(this.pendingInputs.values());
  }
}

/**
 * User input stage
 */
export class UserInputStage extends Stage {
  constructor(
    private config: UserInputConfig,
    private inputManager: UserInputManager
  ) {
    super({
      name: `input-${config.stageName}`,
      description: `User input for ${config.stageName}`,
      execute: async (context) => {
        const response = await inputManager.requestInput(config, context);

        // Add input values to context state
        Object.assign(context.state, response.values);

        return response.values;
      },
      timeout: config.timeout,
    });
  }
}

/**
 * Notification service interface
 */
export interface NotificationService {
  send(notification: {
    type: 'approval' | 'input' | 'error' | 'complete';
    title: string;
    message: string;
    data?: unknown;
    recipients?: string[];
  }): Promise<void>;
}

/**
 * Console notification service
 */
export class ConsoleNotificationService implements NotificationService {
  async send(notification: {
    type: string;
    title: string;
    message: string;
    data?: unknown;
  }): Promise<void> {
    console.log('\n=== Notification ===');
    console.log(`Type: ${notification.type}`);
    console.log(`Title: ${notification.title}`);
    console.log(`Message: ${notification.message}`);
    if (notification.data) {
      console.log(`Data: ${JSON.stringify(notification.data, null, 2)}`);
    }
    console.log('==================\n');
  }
}

/**
 * Email notification service (mock)
 */
export class EmailNotificationService implements NotificationService {
  constructor(private emailClient?: any) {}

  async send(notification: {
    type: string;
    title: string;
    message: string;
    recipients?: string[];
  }): Promise<void> {
    if (!this.emailClient) {
      console.log('[Email] Would send:', notification.title, 'to', notification.recipients);
      return;
    }

    // Mock email sending
    try {
      await this.emailClient.send({
        to: notification.recipients,
        subject: notification.title,
        body: notification.message,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }
}

/**
 * Create approval gate middleware
 */
export function createApprovalMiddleware(approvalManager: ApprovalManager) {
  return {
    name: 'approval-notifications',
    onStageStart: async (context: PipelineContext, stage: PipelineStage) => {
      const isApprovalStage = stage.name.startsWith('approval-');
      if (isApprovalStage) {
        (context.metadata as any).awaitingApproval = true;
      }
    },
    onStageComplete: async (context: PipelineContext) => {
      delete (context.metadata as any).awaitingApproval;
    },
  };
}

/**
 * Create user input middleware
 */
export function createUserInputMiddleware(inputManager: UserInputManager) {
  return {
    name: 'user-input-notifications',
    onStageStart: async (context: PipelineContext, stage: PipelineStage) => {
      const isInputStage = stage.name.startsWith('input-');
      if (isInputStage) {
        (context.metadata as any).awaitingInput = true;
      }
    },
    onStageComplete: async (context: PipelineContext) => {
      delete (context.metadata as any).awaitingInput;
    },
  };
}
