/**
 * Agent Pipeline Stages
 *
 * Specialized stages for each agent in the EstateWise system,
 * integrating with the assembly line pipeline architecture.
 */

import { Stage, createStage } from "../Stage.js";
import type { PipelineContext } from "../types.js";
import type { Agent, AgentContext, AgentMessage } from "../../core/types.js";

/**
 * State interface for agent pipeline
 */
export interface AgentPipelineState {
  goal: string;
  history: AgentMessage[];
  zpids: number[];
  rankedZpids?: number[];
  plan?: any;
  parsed?: any;
  analytics?: any;
  mapLink?: string;
  mortgage?: any;
  affordability?: any;
  pairs?: any;
  compliance?: any;
  propertyResults?: any[];
  graphResults?: any[];
  [key: string]: unknown;
}

/**
 * Create a stage from an existing agent
 */
export function createAgentStage(agent: Agent, options?: {
  description?: string;
  retryable?: boolean;
  maxRetries?: number;
  timeout?: number;
}): Stage<unknown, AgentMessage, AgentPipelineState> {
  return new Stage({
    name: agent.role,
    description: options?.description || `Execute ${agent.role} agent`,
    execute: async (context: PipelineContext<unknown, AgentPipelineState>) => {
      const agentContext: AgentContext = {
        goal: context.state.goal || String(context.input),
        history: context.state.history || context.messages,
        blackboard: context.blackboard,
      };

      // Execute agent
      const message = await agent.think(agentContext);

      // Update context with agent message
      context.messages.push(message);
      context.state.history = context.messages;

      // Update blackboard based on message data
      if (message.data) {
        Object.assign(context.blackboard, message.data);
      }

      return message;
    },
    retryable: options?.retryable ?? true,
    maxRetries: options?.maxRetries ?? 2,
    timeout: options?.timeout ?? 60000,
  });
}

/**
 * Stage for parsing the goal and extracting filters
 */
export function createGoalParserStage(options?: {
  timeout?: number;
}): Stage<string, any, AgentPipelineState> {
  return createStage(
    'parse-goal',
    async (context) => {
      const goal = String(context.input);
      context.state.goal = goal;

      // Parse goal for structured data (beds, baths, price, location, etc.)
      const parsed = {
        zpids: [] as number[],
        zipcode: null as string | null,
        city: null as string | null,
        state: null as string | null,
        beds: null as number | null,
        baths: null as number | null,
        price: null as number | null,
        apr: null as number | null,
        years: null as number | null,
      };

      // Extract ZPIDs (format: ZPID:12345 or zpid:12345)
      const zpidMatches = goal.matchAll(/zpid:?\s*(\d+)/gi);
      for (const match of zpidMatches) {
        parsed.zpids.push(parseInt(match[1], 10));
      }

      // Extract bedrooms
      const bedsMatch = goal.match(/(\d+)\s*(?:bed|bedroom|br)/i);
      if (bedsMatch) {
        parsed.beds = parseInt(bedsMatch[1], 10);
      }

      // Extract bathrooms
      const bathsMatch = goal.match(/(\d+)\s*(?:bath|bathroom|ba)/i);
      if (bathsMatch) {
        parsed.baths = parseInt(bathsMatch[1], 10);
      }

      // Extract price
      const priceMatch = goal.match(/\$?\s*(\d+(?:,\d{3})*(?:k|K)?)\s*(?:max|under|below)?/);
      if (priceMatch) {
        let price = parseInt(priceMatch[1].replace(/,/g, ''), 10);
        if (priceMatch[1].toLowerCase().includes('k')) {
          price *= 1000;
        }
        parsed.price = price;
      }

      // Extract location (city, state, zipcode)
      const zipcodeMatch = goal.match(/\b(\d{5})\b/);
      if (zipcodeMatch) {
        parsed.zipcode = zipcodeMatch[1];
      }

      // Common city names
      const cities = ['Chapel Hill', 'Durham', 'Raleigh', 'Cary', 'Carrboro'];
      for (const city of cities) {
        if (goal.toLowerCase().includes(city.toLowerCase())) {
          parsed.city = city;
          break;
        }
      }

      // Extract state
      const stateMatch = goal.match(/\b([A-Z]{2})\b/);
      if (stateMatch) {
        parsed.state = stateMatch[1];
      } else if (parsed.city) {
        parsed.state = 'NC'; // Default to NC for Triangle cities
      }

      context.state.parsed = parsed;
      context.blackboard.parsed = parsed;

      if (parsed.zpids.length > 0) {
        context.state.zpids = parsed.zpids;
        context.blackboard.zpids = parsed.zpids;
      }

      return parsed;
    },
    {
      description: 'Parse goal and extract structured filters',
      timeout: options?.timeout ?? 5000,
      retryable: false,
    }
  );
}

/**
 * Stage for property search
 */
export function createPropertySearchStage(options?: {
  toolClient?: any;
  timeout?: number;
}): Stage<unknown, any, AgentPipelineState> {
  return createStage(
    'property-search',
    async (context) => {
      const parsed = context.state.parsed;
      const toolClient = options?.toolClient;

      if (!toolClient) {
        throw new Error('ToolClient is required for property search');
      }

      // Build search parameters
      const searchParams: any = {};

      if (parsed?.city) searchParams.city = parsed.city;
      if (parsed?.state) searchParams.state = parsed.state;
      if (parsed?.zipcode) searchParams.zipcode = parsed.zipcode;
      if (parsed?.beds) searchParams.beds = parsed.beds;
      if (parsed?.baths) searchParams.baths = parsed.baths;
      if (parsed?.price) searchParams.maxPrice = parsed.price;

      // Call search tool
      const results = await toolClient.callTool('properties.search', searchParams);

      context.state.propertyResults = results;

      // Extract ZPIDs
      if (Array.isArray(results)) {
        const zpids = results.map((p: any) => p.zpid).filter(Boolean);
        context.state.zpids = zpids;
        context.blackboard.zpids = zpids;
      }

      return results;
    },
    {
      description: 'Search for properties based on filters',
      timeout: options?.timeout ?? 30000,
      retryable: true,
      maxRetries: 2,
    }
  );
}

/**
 * Stage for analytics summarization
 */
export function createAnalyticsSummaryStage(options?: {
  toolClient?: any;
  timeout?: number;
}): Stage<unknown, any, AgentPipelineState> {
  return createStage(
    'analytics-summary',
    async (context) => {
      const toolClient = options?.toolClient;
      const zpids = context.state.zpids || context.blackboard.zpids;

      if (!toolClient || !zpids || zpids.length === 0) {
        return null;
      }

      const summary = await toolClient.callTool('analytics.summarizeSearch', { zpids });

      context.state.analytics = {
        ...context.state.analytics,
        summary,
      };
      context.blackboard.analytics = context.state.analytics;

      return summary;
    },
    {
      description: 'Generate analytics summary for search results',
      timeout: options?.timeout ?? 20000,
      retryable: true,
      maxRetries: 2,
    }
  );
}

/**
 * Stage for grouping by ZIP code
 */
export function createGroupByZipStage(options?: {
  toolClient?: any;
  timeout?: number;
}): Stage<unknown, any, AgentPipelineState> {
  return createStage(
    'group-by-zip',
    async (context) => {
      const toolClient = options?.toolClient;
      const zpids = context.state.zpids || context.blackboard.zpids;

      if (!toolClient || !zpids || zpids.length === 0) {
        return null;
      }

      const groups = await toolClient.callTool('analytics.groupByZip', { zpids });

      context.state.analytics = {
        ...context.state.analytics,
        groups,
      };
      context.blackboard.analytics = context.state.analytics;

      return groups;
    },
    {
      description: 'Group properties by ZIP code',
      timeout: options?.timeout ?? 15000,
      retryable: true,
      maxRetries: 2,
    }
  );
}

/**
 * Stage for deduplication and ranking
 */
export function createDedupeRankStage(options?: {
  maxResults?: number;
}): Stage<unknown, number[], AgentPipelineState> {
  return createStage(
    'dedupe-rank',
    async (context) => {
      const zpids = context.state.zpids || context.blackboard.zpids || [];
      const maxResults = options?.maxResults ?? 100;

      // Deduplicate
      const uniqueZpids = Array.from(new Set(zpids));

      // Limit to max results
      const rankedZpids = uniqueZpids.slice(0, maxResults);

      context.state.rankedZpids = rankedZpids;
      context.blackboard.rankedZpids = rankedZpids;

      return rankedZpids;
    },
    {
      description: 'Deduplicate and rank ZPIDs',
      timeout: 5000,
      retryable: false,
    }
  );
}

/**
 * Stage for graph analysis
 */
export function createGraphAnalysisStage(options?: {
  toolClient?: any;
  timeout?: number;
}): Stage<unknown, any, AgentPipelineState> {
  return createStage(
    'graph-analysis',
    async (context) => {
      const toolClient = options?.toolClient;
      const zpids = context.state.rankedZpids || context.state.zpids || context.blackboard.zpids;

      if (!toolClient || !zpids || zpids.length === 0) {
        return null;
      }

      // Run graph analysis (similarities, relationships)
      const results = await toolClient.callTool('graph.similar', {
        zpids: zpids.slice(0, 10), // Limit to first 10 for performance
      });

      context.state.graphResults = results;

      return results;
    },
    {
      description: 'Analyze property relationships in knowledge graph',
      timeout: options?.timeout ?? 30000,
      retryable: true,
      maxRetries: 2,
    }
  );
}

/**
 * Stage for map link generation
 */
export function createMapLinkStage(options?: {
  toolClient?: any;
  timeout?: number;
}): Stage<unknown, string, AgentPipelineState> {
  return createStage(
    'map-link',
    async (context) => {
      const toolClient = options?.toolClient;
      const zpids = context.state.rankedZpids || context.state.zpids || context.blackboard.zpids;

      if (!toolClient || !zpids || zpids.length === 0) {
        return '';
      }

      const mapLink = await toolClient.callTool('map.linkForZpids', {
        zpids: zpids.slice(0, 50), // Limit for URL length
      });

      context.state.mapLink = mapLink;
      context.blackboard.mapLink = mapLink;

      return mapLink;
    },
    {
      description: 'Generate map deep link for properties',
      timeout: options?.timeout ?? 10000,
      retryable: true,
      maxRetries: 2,
    }
  );
}

/**
 * Stage for mortgage calculation
 */
export function createMortgageCalculationStage(options?: {
  toolClient?: any;
  timeout?: number;
}): Stage<unknown, any, AgentPipelineState> {
  return createStage(
    'mortgage-calculation',
    async (context) => {
      const toolClient = options?.toolClient;
      const parsed = context.state.parsed;

      if (!toolClient || !parsed?.price) {
        return null;
      }

      const mortgageParams = {
        principal: parsed.price,
        apr: parsed.apr || 6.5,
        years: parsed.years || 30,
      };

      const mortgage = await toolClient.callTool('finance.mortgage', mortgageParams);

      context.state.mortgage = mortgage;
      context.blackboard.mortgage = mortgage;

      return mortgage;
    },
    {
      description: 'Calculate mortgage payments',
      timeout: options?.timeout ?? 10000,
      retryable: true,
      maxRetries: 2,
    }
  );
}

/**
 * Stage for affordability calculation
 */
export function createAffordabilityCalculationStage(options?: {
  toolClient?: any;
  timeout?: number;
  defaultIncome?: number;
}): Stage<unknown, any, AgentPipelineState> {
  return createStage(
    'affordability-calculation',
    async (context) => {
      const toolClient = options?.toolClient;

      if (!toolClient) {
        return null;
      }

      const affordabilityParams = {
        income: options?.defaultIncome || 100000,
        debts: 0,
        downPayment: 0.2,
      };

      const affordability = await toolClient.callTool('finance.affordability', affordabilityParams);

      context.state.affordability = affordability;
      context.blackboard.affordability = affordability;

      return affordability;
    },
    {
      description: 'Calculate affordability estimates',
      timeout: options?.timeout ?? 10000,
      retryable: true,
      maxRetries: 2,
    }
  );
}

/**
 * Stage for compliance checks
 */
export function createComplianceCheckStage(): Stage<unknown, any, AgentPipelineState> {
  return createStage(
    'compliance-check',
    async (context) => {
      const issues: string[] = [];

      // Check for required data
      if (!context.state.zpids || context.state.zpids.length === 0) {
        issues.push('No properties found');
      }

      // Check for excessive results
      if (context.state.zpids && context.state.zpids.length > 1000) {
        issues.push('Too many results - consider refining search');
      }

      const compliance = {
        ok: issues.length === 0,
        issues,
      };

      context.state.compliance = compliance;
      context.blackboard.compliance = compliance;

      return compliance;
    },
    {
      description: 'Run compliance and sanity checks',
      timeout: 5000,
      retryable: false,
    }
  );
}

/**
 * Stage for generating final report
 */
export function createReportGenerationStage(): Stage<unknown, string, AgentPipelineState> {
  return createStage(
    'generate-report',
    async (context) => {
      const parts: string[] = [];

      parts.push(`# EstateWise Property Report\n`);
      parts.push(`**Query:** ${context.state.goal}\n`);

      if (context.state.parsed) {
        parts.push(`\n## Filters`);
        const p = context.state.parsed;
        if (p.city) parts.push(`- City: ${p.city}`);
        if (p.state) parts.push(`- State: ${p.state}`);
        if (p.zipcode) parts.push(`- ZIP: ${p.zipcode}`);
        if (p.beds) parts.push(`- Bedrooms: ${p.beds}`);
        if (p.baths) parts.push(`- Bathrooms: ${p.baths}`);
        if (p.price) parts.push(`- Max Price: $${p.price.toLocaleString()}`);
        parts.push('');
      }

      if (context.state.propertyResults) {
        parts.push(`\n## Results`);
        parts.push(`Found ${context.state.propertyResults.length} properties`);
        parts.push('');
      }

      if (context.state.analytics?.summary) {
        parts.push(`\n## Market Analytics`);
        parts.push(JSON.stringify(context.state.analytics.summary, null, 2));
        parts.push('');
      }

      if (context.state.mapLink) {
        parts.push(`\n## Map`);
        parts.push(`[View on Map](${context.state.mapLink})`);
        parts.push('');
      }

      if (context.state.mortgage) {
        parts.push(`\n## Mortgage Estimate`);
        parts.push(JSON.stringify(context.state.mortgage, null, 2));
        parts.push('');
      }

      if (context.state.compliance && !context.state.compliance.ok) {
        parts.push(`\n## ⚠️ Issues`);
        context.state.compliance.issues.forEach((issue: string) => {
          parts.push(`- ${issue}`);
        });
        parts.push('');
      }

      return parts.join('\n');
    },
    {
      description: 'Generate final report',
      timeout: 10000,
      retryable: false,
    }
  );
}
