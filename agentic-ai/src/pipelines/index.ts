/**
 * EstateWise Pipelines - Main Entry Point
 *
 * This module provides specialized, production-ready pipelines for common
 * real estate workflows in the EstateWise application.
 *
 * All pipelines are built on top of the enterprise pipeline system and integrate
 * seamlessly with the existing AgentOrchestrator, LangGraph, and CrewAI runtimes.
 */

// Property Search Pipelines
export {
  createPropertySearchPipeline,
  createQuickPropertySearchPipeline,
  createAdvancedPropertySearchPipeline,
  runPropertySearch,
  type PropertySearchInput,
  type PropertySearchResult,
} from './propertySearch.js';

// Financial Analysis Pipelines
export {
  createFinancialAnalysisPipeline,
  createMortgageCalculatorPipeline,
  createAffordabilityCheckerPipeline,
  createInvestmentAnalysisPipeline,
  runFinancialAnalysis,
  calculateMortgage,
  checkAffordability,
  type FinancialAnalysisInput,
  type FinancialAnalysisResult,
} from './financialAnalysis.js';

// Compliance Check Pipelines
export {
  createComplianceCheckPipeline,
  createZoningCheckPipeline,
  createDisclosureVerificationPipeline,
  createRegulatoryCompliancePipeline,
  runComplianceCheck,
  checkZoning,
  type ComplianceCheckInput,
  type ComplianceCheckResult,
  type ComplianceIssue,
} from './complianceCheck.js';

// Graph Analysis Pipelines
export {
  createGraphAnalysisPipeline,
  createRelationshipDiscoveryPipeline,
  createPatternMatchingPipeline,
  createNetworkClusteringPipeline,
  runGraphAnalysis,
  discoverRelationships,
  findPatterns,
  type GraphAnalysisInput,
  type GraphAnalysisResult,
  type GraphNode,
  type GraphEdge,
  type GraphPattern,
} from './graphAnalysis.js';

// Market Research Pipelines
export {
  createMarketResearchPipeline,
  createQuickMarketOverviewPipeline,
  createDeepMarketAnalysisPipeline,
  runMarketResearchPipeline,
  runMarketResearch, // Legacy
  type MarketResearchInput,
  type MarketResearchResult,
} from './marketResearch.js';

// Composite Workflows
export {
  createComprehensiveAnalysisPipeline,
  createInvestmentWorkflowPipeline,
  createDecisionSupportWorkflow,
  runComprehensiveAnalysis,
  runInvestmentWorkflow,
  runDecisionSupport,
  type ComprehensiveAnalysisInput,
  type ComprehensiveAnalysisResult,
} from './compositeWorkflows.js';

// Import for use in this file
import {
  createComprehensiveAnalysisPipeline,
  createInvestmentWorkflowPipeline,
  createDecisionSupportWorkflow,
  runComprehensiveAnalysis,
  runInvestmentWorkflow,
  runDecisionSupport,
} from './compositeWorkflows.js';

/**
 * Convenience object for accessing all pipelines
 */
export const Pipelines = {
  // Property Search
  propertySearch: {
    create: () => import('./propertySearch.js').then(m => m.createPropertySearchPipeline),
    createQuick: () => import('./propertySearch.js').then(m => m.createQuickPropertySearchPipeline),
    createAdvanced: () => import('./propertySearch.js').then(m => m.createAdvancedPropertySearchPipeline),
    run: (goal: string, options?: any) => import('./propertySearch.js').then(m => m.runPropertySearch(goal, options)),
  },

  // Financial Analysis
  financial: {
    create: () => import('./financialAnalysis.js').then(m => m.createFinancialAnalysisPipeline),
    createMortgageCalculator: () => import('./financialAnalysis.js').then(m => m.createMortgageCalculatorPipeline),
    createAffordabilityChecker: () => import('./financialAnalysis.js').then(m => m.createAffordabilityCheckerPipeline),
    createInvestmentAnalysis: () => import('./financialAnalysis.js').then(m => m.createInvestmentAnalysisPipeline),
    run: (input: any) => import('./financialAnalysis.js').then(m => m.runFinancialAnalysis(input)),
    calculateMortgage: (price: number, downPayment: number, interestRate: number, years: number) =>
      import('./financialAnalysis.js').then(m => m.calculateMortgage(price, downPayment, interestRate, years)),
    checkAffordability: (annualIncome: number, monthlyDebts: number) =>
      import('./financialAnalysis.js').then(m => m.checkAffordability(annualIncome, monthlyDebts)),
  },

  // Compliance
  compliance: {
    create: () => import('./complianceCheck.js').then(m => m.createComplianceCheckPipeline),
    createZoningCheck: () => import('./complianceCheck.js').then(m => m.createZoningCheckPipeline),
    createDisclosureVerification: () => import('./complianceCheck.js').then(m => m.createDisclosureVerificationPipeline),
    createRegulatoryCompliance: () => import('./complianceCheck.js').then(m => m.createRegulatoryCompliancePipeline),
    run: (input: any) => import('./complianceCheck.js').then(m => m.runComplianceCheck(input)),
    checkZoning: (address: string) => import('./complianceCheck.js').then(m => m.checkZoning(address)),
  },

  // Graph Analysis
  graph: {
    create: () => import('./graphAnalysis.js').then(m => m.createGraphAnalysisPipeline),
    createRelationshipDiscovery: () => import('./graphAnalysis.js').then(m => m.createRelationshipDiscoveryPipeline),
    createPatternMatching: () => import('./graphAnalysis.js').then(m => m.createPatternMatchingPipeline),
    createNetworkClustering: () => import('./graphAnalysis.js').then(m => m.createNetworkClusteringPipeline),
    run: (input: any) => import('./graphAnalysis.js').then(m => m.runGraphAnalysis(input)),
    discoverRelationships: (propertyIds: string[]) =>
      import('./graphAnalysis.js').then(m => m.discoverRelationships(propertyIds)),
    findPatterns: (goal: string) => import('./graphAnalysis.js').then(m => m.findPatterns(goal)),
  },

  // Market Research
  marketResearch: {
    create: () => import('./marketResearch.js').then(m => m.createMarketResearchPipeline),
    createQuickOverview: () => import('./marketResearch.js').then(m => m.createQuickMarketOverviewPipeline),
    createDeepAnalysis: () => import('./marketResearch.js').then(m => m.createDeepMarketAnalysisPipeline),
    run: (goal: any) => import('./marketResearch.js').then(m => m.runMarketResearchPipeline(goal)),
    runLegacy: (goal: any) => import('./marketResearch.js').then(m => m.runMarketResearch(goal)),
  },

  // Composite Workflows
  composite: {
    createComprehensiveAnalysis: createComprehensiveAnalysisPipeline,
    createInvestmentWorkflow: createInvestmentWorkflowPipeline,
    createDecisionSupport: createDecisionSupportWorkflow,
    runComprehensiveAnalysis: runComprehensiveAnalysis,
    runInvestmentWorkflow: runInvestmentWorkflow,
    runDecisionSupport: runDecisionSupport,
  },
};

/**
 * Quick access to most commonly used pipelines
 */
export const QuickPipelines = {
  /** Quick property search - fast and simple */
  searchProperties: async (goal: string, options?: any) => {
    const { runPropertySearch } = await import('./propertySearch.js');
    return runPropertySearch(goal, options);
  },

  /** Calculate mortgage payments */
  calculateMortgage: async (price: number, downPayment: number, interestRate: number, years: number) => {
    const { calculateMortgage } = await import('./financialAnalysis.js');
    return calculateMortgage(price, downPayment, interestRate, years);
  },

  /** Check if property is affordable */
  checkAffordability: async (annualIncome: number, monthlyDebts: number) => {
    const { checkAffordability } = await import('./financialAnalysis.js');
    return checkAffordability(annualIncome, monthlyDebts);
  },

  /** Check zoning compliance */
  checkZoning: async (address: string) => {
    const { checkZoning } = await import('./complianceCheck.js');
    return checkZoning(address);
  },

  /** Run market research */
  marketResearch: async (goal: any) => {
    const { runMarketResearchPipeline } = await import('./marketResearch.js');
    return runMarketResearchPipeline(goal);
  },

  /** Run comprehensive analysis */
  comprehensiveAnalysis: async (input: any) => {
    const { runComprehensiveAnalysis } = await import('./compositeWorkflows.js');
    return runComprehensiveAnalysis(input);
  },
};

/**
 * Pipeline templates for common use cases
 */
export const PipelineTemplates = {
  /**
   * First-time homebuyer workflow
   */
  firstTimeHomeBuyer: () => {
    return createComprehensiveAnalysisPipeline({
      enableParallel: true,
      enableCaching: true,
    });
  },

  /**
   * Real estate investor workflow
   */
  investor: () => {
    return createInvestmentWorkflowPipeline();
  },

  /**
   * Quick property lookup
   */
  quickLookup: async () => {
    const { createQuickPropertySearchPipeline } = await import('./propertySearch.js');
    return createQuickPropertySearchPipeline();
  },

  /**
   * Detailed market analysis
   */
  marketAnalysis: async () => {
    const { createDeepMarketAnalysisPipeline } = await import('./marketResearch.js');
    return createDeepMarketAnalysisPipeline();
  },

  /**
   * Compliance-focused workflow
   */
  complianceFocused: () => {
    return createComprehensiveAnalysisPipeline({
      enableParallel: false,
      enableCaching: false,
    });
  },
};

// Re-export commonly used types from the enterprise pipeline system
export type {
  Pipeline,
  PipelineContext,
  PipelineResult,
  PipelineStage,
  AgentPipelineState,
} from '../pipeline/index.js';
