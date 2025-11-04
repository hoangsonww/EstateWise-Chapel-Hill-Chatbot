/**
 * Compliance Check Pipeline
 *
 * Regulatory compliance checking pipeline for real estate transactions,
 * zoning validation, legal requirements, and disclosure verification.
 */

import {
  createPipeline,
  createGoalParserStage,
  createPropertySearchStage,
  createComplianceCheckStage,
  createReportGenerationStage,
  createLoggingMiddleware,
  createMetricsMiddleware,
  createAuditMiddleware,
  createValidationMiddleware,
  type AgentPipelineState,
} from '../pipeline/index.js';

/**
 * Compliance check input
 */
export interface ComplianceCheckInput {
  goal?: string;
  propertyId?: string;
  propertyAddress?: string;
  transactionType?: 'buy' | 'sell' | 'rent' | 'lease';
  jurisdiction?: string;
  includeReport?: boolean;
  auditTrail?: boolean;
}

/**
 * Compliance issue
 */
export interface ComplianceIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'zoning' | 'legal' | 'disclosure' | 'environmental' | 'safety' | 'other';
  description: string;
  recommendation?: string;
  regulation?: string;
  deadline?: Date;
}

/**
 * Compliance check result
 */
export interface ComplianceCheckResult {
  compliant: boolean;
  issues: ComplianceIssue[];
  checks: {
    zoning: boolean;
    legalRequirements: boolean;
    disclosures: boolean;
    environmental: boolean;
    safety: boolean;
  };
  property?: {
    zpid: string;
    address: string;
    zoning: string;
    jurisdiction: string;
  };
  report?: string;
  auditTrail?: Array<{
    timestamp: number;
    action: string;
    user?: string;
    details: unknown;
  }>;
  metrics: {
    checkTime: number;
    checksPerformed: number;
    criticalIssues: number;
    warnings: number;
  };
}

/**
 * Create a compliance check pipeline
 */
export function createComplianceCheckPipeline(options?: {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableAudit?: boolean;
  strictMode?: boolean;
}) {
  const builder = createPipeline<ComplianceCheckInput, AgentPipelineState>()
    .withName('compliance-check')
    .withDescription('Verify regulatory compliance for real estate transactions');

  // Add middleware
  if (options?.enableLogging !== false) {
    builder.use(createLoggingMiddleware({ level: 'info' }));
  }

  if (options?.enableMetrics !== false) {
    builder.use(createMetricsMiddleware());
  }

  if (options?.enableAudit) {
    builder.use(
      createAuditMiddleware({
        includeInput: true,
        includeOutput: true,
        includeErrors: true,
      })
    );
  }

  builder.use(
    createValidationMiddleware({
      validateInput: (input) => {
        const complianceInput = input as ComplianceCheckInput;
        if (
          !complianceInput.goal &&
          !complianceInput.propertyId &&
          !complianceInput.propertyAddress
        ) {
          return {
            valid: false,
            errors: ['One of goal, propertyId, or propertyAddress must be provided'],
          };
        }
        return { valid: true };
      },
    })
  );

  // Build pipeline stages
  return builder
    .conditional(
      (context) => !!(context.input as ComplianceCheckInput).goal,
      createPipeline()
        .stage(createGoalParserStage())
        .stage(createPropertySearchStage({ maxResults: 1 }))
        .build()
    )
    .stage(createComplianceCheckStage({ strictMode: options?.strictMode }))
    .conditional(
      (context) => (context.input as ComplianceCheckInput).includeReport !== false,
      createReportGenerationStage()
    )
    .transform(async (context) => {
      const state = context.state as AgentPipelineState;
      const input = context.input as ComplianceCheckInput;

      const issues: ComplianceIssue[] = state.complianceIssues || [];
      const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
      const warnings = issues.filter((i) => i.severity === 'warning').length;

      const result: ComplianceCheckResult = {
        compliant: criticalIssues === 0 && (!options?.strictMode || warnings === 0),
        issues,
        checks: state.complianceChecks || {
          zoning: false,
          legalRequirements: false,
          disclosures: false,
          environmental: false,
          safety: false,
        },
        property: state.properties?.[0]
          ? {
              zpid: state.properties[0].zpid,
              address: state.properties[0].address,
              zoning: state.properties[0].zoning,
              jurisdiction: state.properties[0].jurisdiction,
            }
          : undefined,
        report: state.report,
        auditTrail: input.auditTrail ? (state.auditTrail as any) : undefined,
        metrics: {
          checkTime: Date.now() - context.metadata.startTime,
          checksPerformed: Object.values(state.complianceChecks || {}).filter(Boolean).length,
          criticalIssues,
          warnings,
        },
      };

      return result;
    })
    .build();
}

/**
 * Create a quick zoning check pipeline
 */
export function createZoningCheckPipeline() {
  return createPipeline<ComplianceCheckInput, AgentPipelineState>()
    .withName('zoning-check')
    .withDescription('Quick zoning compliance verification')
    .use(createLoggingMiddleware({ level: 'warn' }))
    .conditional(
      (context) => !!(context.input as ComplianceCheckInput).goal,
      createPipeline()
        .stage(createGoalParserStage())
        .stage(createPropertySearchStage({ maxResults: 1 }))
        .build()
    )
    .stage(createComplianceCheckStage({ checksToPerform: ['zoning'] }))
    .transform(async (context) => {
      const state = context.state as AgentPipelineState;
      const zoningIssues =
        state.complianceIssues?.filter((i: ComplianceIssue) => i.category === 'zoning') || [];

      return {
        compliant: zoningIssues.filter((i: ComplianceIssue) => i.severity === 'critical').length === 0,
        issues: zoningIssues,
        property: state.properties?.[0],
        metrics: {
          checkTime: Date.now() - context.metadata.startTime,
          checksPerformed: 1,
          criticalIssues: zoningIssues.filter((i: ComplianceIssue) => i.severity === 'critical').length,
          warnings: zoningIssues.filter((i: ComplianceIssue) => i.severity === 'warning').length,
        },
      };
    })
    .build();
}

/**
 * Create a disclosure verification pipeline
 */
export function createDisclosureVerificationPipeline() {
  return createPipeline<ComplianceCheckInput, AgentPipelineState>()
    .withName('disclosure-verification')
    .withDescription('Verify required property disclosures')
    .use(createLoggingMiddleware({ level: 'info' }))
    .use(createAuditMiddleware({ includeInput: true, includeOutput: true }))
    .conditional(
      (context) => !!(context.input as ComplianceCheckInput).goal,
      createPipeline()
        .stage(createGoalParserStage())
        .stage(createPropertySearchStage({ maxResults: 1 }))
        .build()
    )
    .stage(createComplianceCheckStage({ checksToPerform: ['disclosures'] }))
    .transform(async (context) => {
      const state = context.state as AgentPipelineState;
      const disclosureIssues =
        state.complianceIssues?.filter((i: ComplianceIssue) => i.category === 'disclosure') || [];

      return {
        compliant: disclosureIssues.filter((i: ComplianceIssue) => i.severity === 'critical').length === 0,
        issues: disclosureIssues,
        property: state.properties?.[0],
        metrics: {
          checkTime: Date.now() - context.metadata.startTime,
          checksPerformed: 1,
          criticalIssues: disclosureIssues.filter((i: ComplianceIssue) => i.severity === 'critical').length,
          warnings: disclosureIssues.filter((i: ComplianceIssue) => i.severity === 'warning').length,
        },
      };
    })
    .build();
}

/**
 * Create a comprehensive regulatory compliance pipeline
 */
export function createRegulatoryCompliancePipeline() {
  return createPipeline<ComplianceCheckInput, AgentPipelineState>()
    .withName('regulatory-compliance')
    .withDescription('Comprehensive regulatory compliance verification')
    .use(createLoggingMiddleware({ level: 'info' }))
    .use(createMetricsMiddleware())
    .use(createAuditMiddleware({ includeInput: true, includeOutput: true, includeErrors: true }))
    .conditional(
      (context) => !!(context.input as ComplianceCheckInput).goal,
      createPipeline()
        .stage(createGoalParserStage())
        .stage(createPropertySearchStage({ maxResults: 1 }))
        .build()
    )
    .stage(
      createComplianceCheckStage({
        strictMode: true,
        checksToPerform: ['zoning', 'legal', 'disclosures', 'environmental', 'safety'],
      })
    )
    .stage(createReportGenerationStage())
    .transform(async (context) => {
      const state = context.state as AgentPipelineState;
      const issues: ComplianceIssue[] = state.complianceIssues || [];

      return {
        compliant: !issues.some((i) => i.severity === 'critical'),
        issues,
        checks: state.complianceChecks,
        property: state.properties?.[0],
        report: state.report,
        auditTrail: state.auditTrail,
        metrics: {
          checkTime: Date.now() - context.metadata.startTime,
          checksPerformed: Object.values(state.complianceChecks || {}).filter(Boolean).length,
          criticalIssues: issues.filter((i) => i.severity === 'critical').length,
          warnings: issues.filter((i) => i.severity === 'warning').length,
        },
      };
    })
    .build();
}

/**
 * Run a compliance check
 */
export async function runComplianceCheck(
  input: ComplianceCheckInput
): Promise<ComplianceCheckResult> {
  const pipeline = createComplianceCheckPipeline({
    enableLogging: true,
    enableMetrics: true,
    enableAudit: input.auditTrail,
    strictMode: false,
  });

  const result = await pipeline.execute(input);

  if (!result.success) {
    throw new Error(`Compliance check failed: ${result.error?.message}`);
  }

  return result.output as ComplianceCheckResult;
}

/**
 * Quick zoning check
 */
export async function checkZoning(
  propertyAddress: string,
  jurisdiction?: string
): Promise<{ compliant: boolean; issues: ComplianceIssue[] }> {
  const pipeline = createZoningCheckPipeline();

  const result = await pipeline.execute({
    propertyAddress,
    jurisdiction,
  });

  if (!result.success) {
    throw new Error(`Zoning check failed: ${result.error?.message}`);
  }

  const output = result.output as any;
  return {
    compliant: output.compliant,
    issues: output.issues,
  };
}
