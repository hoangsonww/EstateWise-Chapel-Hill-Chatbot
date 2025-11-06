/**
 * Financial Analysis Pipeline
 *
 * Comprehensive financial analysis pipeline with mortgage calculations,
 * affordability checks, and investment analysis.
 */

import {
  createPipeline,
  createGoalParserStage,
  createPropertySearchStage,
  createMortgageCalculationStage,
  createAffordabilityCalculationStage,
  createReportGenerationStage,
  createLoggingMiddleware,
  createMetricsMiddleware,
  createValidationMiddleware,
  type AgentPipelineState,
} from "../pipeline/index.js";

/**
 * Financial analysis input
 */
export interface FinancialAnalysisInput {
  goal?: string;
  propertyPrice?: number;
  downPayment?: number;
  interestRate?: number;
  loanTerm?: number;
  annualIncome?: number;
  monthlyDebts?: number;
  includeReport?: boolean;
}

/**
 * Financial analysis result
 */
export interface FinancialAnalysisResult {
  mortgage?: {
    monthlyPayment: number;
    totalInterest: number;
    totalCost: number;
    principal: number;
    interestRate: number;
    term: number;
  };
  affordability?: {
    isAffordable: boolean;
    debtToIncomeRatio: number;
    maxAffordablePrice: number;
    monthlyBudget: number;
    recommendations: string[];
  };
  properties?: Array<{
    zpid: string;
    address: string;
    price: number;
    monthlyPayment: number;
    isAffordable: boolean;
  }>;
  report?: string;
  metrics: {
    analysisTime: number;
    propertiesAnalyzed: number;
  };
}

/**
 * Create a financial analysis pipeline
 */
export function createFinancialAnalysisPipeline(options?: {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableValidation?: boolean;
}) {
  const builder = createPipeline<FinancialAnalysisInput, AgentPipelineState>()
    .withName("financial-analysis")
    .withDescription("Analyze property affordability and mortgage options");

  // Add middleware
  if (options?.enableLogging !== false) {
    builder.use(createLoggingMiddleware({ logLevel: "info" }));
  }

  if (options?.enableMetrics !== false) {
    builder.use(
      createMetricsMiddleware({
        onMetrics: (metrics) => {
          console.log("[Financial Analysis Metrics]", metrics);
        },
      }),
    );
  }

  if (options?.enableValidation !== false) {
    builder.use(
      createValidationMiddleware({
        validateInput: (input) => {
          const financialInput = input as FinancialAnalysisInput;
          if (
            !financialInput.goal &&
            (!financialInput.propertyPrice || financialInput.propertyPrice <= 0)
          ) {
            return false;
          }
          return true;
        },
      }),
    );
  }

  // Build pipeline stages
  return builder
    .conditional(
      (context) => !!(context.input as FinancialAnalysisInput).goal,
      createGoalParserStage(),
    )
    .conditional(
      (context) => !!(context.input as FinancialAnalysisInput).goal,
      createPropertySearchStage(),
    )
    .addStage(createMortgageCalculationStage())
    .addStage(createAffordabilityCalculationStage())
    .conditional(
      (context) =>
        (context.input as FinancialAnalysisInput).includeReport !== false,
      createReportGenerationStage(),
    )
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      const input = context.input as FinancialAnalysisInput;

      const result: FinancialAnalysisResult = {
        mortgage: state.mortgage,
        affordability: state.affordability,
        properties: state.propertyResults?.map((p: any) => ({
          zpid: p.zpid,
          address: p.address,
          price: p.price,
          monthlyPayment: p.monthlyPayment,
          isAffordable: p.isAffordable,
        })),
        report: (state.report as string) || undefined,
        metrics: {
          analysisTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: state.propertyResults?.length || 0,
        },
      };

      return result;
    })
    .build();
}

/**
 * Create a simple mortgage calculator pipeline
 */
export function createMortgageCalculatorPipeline() {
  return createPipeline<FinancialAnalysisInput, AgentPipelineState>()
    .withName("mortgage-calculator")
    .withDescription("Calculate mortgage payments and total costs")
    .use(createLoggingMiddleware({ logLevel: "warn" }))
    .use(
      createValidationMiddleware({
        validateInput: (input) => {
          const financialInput = input as FinancialAnalysisInput;
          if (
            !financialInput.propertyPrice ||
            financialInput.propertyPrice <= 0
          ) {
            return false;
          }
          return true;
        },
      }),
    )
    .addStage(createMortgageCalculationStage())
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      return {
        mortgage: state.mortgage,
        metrics: {
          analysisTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: 1,
        },
      };
    })
    .build();
}

/**
 * Create an affordability checker pipeline
 */
export function createAffordabilityCheckerPipeline() {
  return createPipeline<FinancialAnalysisInput, AgentPipelineState>()
    .withName("affordability-checker")
    .withDescription("Check property affordability based on income and debts")
    .use(createLoggingMiddleware({ logLevel: "info" }))
    .use(
      createValidationMiddleware({
        validateInput: (input) => {
          const financialInput = input as FinancialAnalysisInput;
          if (
            !financialInput.annualIncome ||
            financialInput.annualIncome <= 0
          ) {
            return false;
          }
          return true;
        },
      }),
    )
    .addStage(createAffordabilityCalculationStage())
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      return {
        affordability: state.affordability,
        metrics: {
          analysisTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: 0,
        },
      };
    })
    .build();
}

/**
 * Create a comprehensive investment analysis pipeline
 */
export function createInvestmentAnalysisPipeline() {
  return createPipeline<FinancialAnalysisInput, AgentPipelineState>()
    .withName("investment-analysis")
    .withDescription("Comprehensive property investment analysis")
    .use(createLoggingMiddleware({ logLevel: "info" }))
    .use(
      createMetricsMiddleware({
        onMetrics: (metrics) => {
          console.log("[Investment Analysis Metrics]", metrics);
        },
      }),
    )
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage())
    .addStage(createMortgageCalculationStage())
    .addStage(createAffordabilityCalculationStage())
    .addStage(createReportGenerationStage())
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      return {
        properties: state.propertyResults,
        mortgage: state.mortgage,
        affordability: state.affordability,
        report: (state.report as string) || undefined,
        investment: state.investment,
        metrics: {
          analysisTime: Date.now() - context.metadata.startTime,
          propertiesAnalyzed: state.propertyResults?.length || 0,
        },
      };
    })
    .build();
}

/**
 * Run a financial analysis
 */
export async function runFinancialAnalysis(
  input: FinancialAnalysisInput,
): Promise<FinancialAnalysisResult> {
  const pipeline = createFinancialAnalysisPipeline();

  const result = await pipeline.execute(input);

  if (!result.success) {
    throw new Error(`Financial analysis failed: ${result.error?.message}`);
  }

  return result.output as unknown as FinancialAnalysisResult;
}

/**
 * Quick mortgage calculation
 */
export async function calculateMortgage(
  propertyPrice: number,
  downPayment: number = 0.2 * propertyPrice,
  interestRate: number = 0.065,
  loanTerm: number = 30,
): Promise<FinancialAnalysisResult["mortgage"]> {
  const pipeline = createMortgageCalculatorPipeline();

  const result = await pipeline.execute({
    propertyPrice,
    downPayment,
    interestRate,
    loanTerm,
  });

  if (!result.success) {
    throw new Error(`Mortgage calculation failed: ${result.error?.message}`);
  }

  return (result.output as unknown as FinancialAnalysisResult).mortgage;
}

/**
 * Check affordability
 */
export async function checkAffordability(
  annualIncome: number,
  monthlyDebts: number = 0,
  propertyPrice?: number,
): Promise<FinancialAnalysisResult["affordability"]> {
  const pipeline = createAffordabilityCheckerPipeline();

  const result = await pipeline.execute({
    annualIncome,
    monthlyDebts,
    propertyPrice,
  });

  if (!result.success) {
    throw new Error(`Affordability check failed: ${result.error?.message}`);
  }

  return (result.output as unknown as FinancialAnalysisResult).affordability;
}
