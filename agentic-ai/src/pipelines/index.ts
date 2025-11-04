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

/**
 * Convenience object for accessing all pipelines
 */
export const Pipelines = {
  // Property Search
  propertySearch: {
    create: createPropertySearchPipeline,
    createQuick: createQuickPropertySearchPipeline,
    createAdvanced: createAdvancedPropertySearchPipeline,
    run: runPropertySearch,
  },

  // Financial Analysis
  financial: {
    create: createFinancialAnalysisPipeline,
    createMortgageCalculator: createMortgageCalculatorPipeline,
    createAffordabilityChecker: createAffordabilityCheckerPipeline,
    createInvestmentAnalysis: createInvestmentAnalysisPipeline,
    run: runFinancialAnalysis,
    calculateMortgage,
    checkAffordability,
  },

  // Compliance
  compliance: {
    create: createComplianceCheckPipeline,
    createZoningCheck: createZoningCheckPipeline,
    createDisclosureVerification: createDisclosureVerificationPipeline,
    createRegulatoryCompliance: createRegulatoryCompliancePipeline,
    run: runComplianceCheck,
    checkZoning,
  },

  // Graph Analysis
  graph: {
    create: createGraphAnalysisPipeline,
    createRelationshipDiscovery: createRelationshipDiscoveryPipeline,
    createPatternMatching: createPatternMatchingPipeline,
    createNetworkClustering: createNetworkClusteringPipeline,
    run: runGraphAnalysis,
    discoverRelationships,
    findPatterns,
  },

  // Market Research
  marketResearch: {
    create: createMarketResearchPipeline,
    createQuickOverview: createQuickMarketOverviewPipeline,
    createDeepAnalysis: createDeepMarketAnalysisPipeline,
    run: runMarketResearchPipeline,
    runLegacy: runMarketResearch, // For backward compatibility
  },

  // Composite Workflows
  composite: {
    createComprehensiveAnalysis: createComprehensiveAnalysisPipeline,
    createInvestmentWorkflow: createInvestmentWorkflowPipeline,
    createDecisionSupport: createDecisionSupportWorkflow,
    runComprehensiveAnalysis,
    runInvestmentWorkflow,
    runDecisionSupport,
  },
};

/**
 * Quick access to most commonly used pipelines
 */
export const QuickPipelines = {
  /** Quick property search - fast and simple */
  searchProperties: runPropertySearch,

  /** Calculate mortgage payments */
  calculateMortgage,

  /** Check if property is affordable */
  checkAffordability,

  /** Check zoning compliance */
  checkZoning,

  /** Run market research */
  marketResearch: runMarketResearchPipeline,

  /** Run comprehensive analysis */
  comprehensiveAnalysis: runComprehensiveAnalysis,
};

/**
 * Pipeline templates for common use cases
 */
export const PipelineTemplates = {
  /**
   * First-time homebuyer workflow
   */
  firstTimeHomeBuyer: () =>
    createComprehensiveAnalysisPipeline({
      enableParallel: true,
      enableCaching: true,
    }),

  /**
   * Real estate investor workflow
   */
  investor: () => createInvestmentWorkflowPipeline(),

  /**
   * Quick property lookup
   */
  quickLookup: () => createQuickPropertySearchPipeline(),

  /**
   * Detailed market analysis
   */
  marketAnalysis: () => createDeepMarketAnalysisPipeline(),

  /**
   * Compliance-focused workflow
   */
  complianceFocused: () =>
    createComprehensiveAnalysisPipeline({
      enableParallel: false,
      enableCaching: false,
    }),
};

// Re-export commonly used types from the enterprise pipeline system
export type {
  Pipeline,
  PipelineContext,
  PipelineResult,
  PipelineStage,
  AgentPipelineState,
} from '../pipeline/index.js';
