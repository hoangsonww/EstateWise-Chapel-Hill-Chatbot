/**
 * Property Search Pipeline
 *
 * Comprehensive property search pipeline with goal parsing, search,
 * deduplication, ranking, and map visualization.
 */

import {
  createPipeline,
  createGoalParserStage,
  createPropertySearchStage,
  createDedupeRankStage,
  createMapLinkStage,
  createLoggingMiddleware,
  createMetricsMiddleware,
  createPerformanceMiddleware,
  createCachingMiddleware,
  type AgentPipelineState,
} from "../pipeline/index.js";

/**
 * Property search input
 */
export interface PropertySearchInput {
  goal: string;
  maxResults?: number;
  includeMap?: boolean;
  cacheResults?: boolean;
}

/**
 * Property search result
 */
export interface PropertySearchResult {
  properties: Array<{
    zpid: string;
    address: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    sqft: number;
    [key: string]: unknown;
  }>;
  mapLink?: string;
  metrics: {
    totalFound: number;
    duplicatesRemoved: number;
    searchTime: number;
  };
}

/**
 * Create a property search pipeline
 */
export function createPropertySearchPipeline(options?: {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  enablePerformance?: boolean;
  maxResults?: number;
}) {
  const builder = createPipeline<PropertySearchInput, AgentPipelineState>()
    .withName("property-search")
    .withDescription(
      "Search and analyze properties based on natural language queries",
    );

  // Add middleware
  if (options?.enableLogging !== false) {
    builder.use(createLoggingMiddleware({ logLevel: "info" }));
  }

  if (options?.enableMetrics !== false) {
    builder.use(
      createMetricsMiddleware({
        onMetrics: (metrics) => {
          console.log("[Pipeline Metrics]", metrics);
        },
      }),
    );
  }

  if (options?.enablePerformance !== false) {
    builder.use(createPerformanceMiddleware({ slowThreshold: 5000 }));
  }

  if (options?.enableCaching) {
    builder.use(
      createCachingMiddleware({
        ttl: 300000, // 5 minutes
        keyGenerator: (context) =>
          `property-search:${(context.input as PropertySearchInput).goal}`,
      }),
    );
  }

  // Build pipeline stages
  return builder
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage())
    .addStage(createDedupeRankStage({ maxResults: options?.maxResults }))
    .conditional((context) => {
      const state = context.state as AgentPipelineState;
      const input = context.input as PropertySearchInput;
      return input.includeMap !== false && (state.zpids?.length || 0) > 0;
    }, createMapLinkStage())
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      const result: PropertySearchResult = {
        properties: state.propertyResults || [],
        mapLink: state.mapLink,
        metrics: {
          totalFound: state.propertyResults?.length || 0,
          duplicatesRemoved: 0,
          searchTime: Date.now() - context.metadata.startTime,
        },
      };
      return result;
    })
    .build();
}

/**
 * Quick search for properties (simplified version)
 */
export function createQuickPropertySearchPipeline() {
  return createPipeline<PropertySearchInput, AgentPipelineState>()
    .withName("quick-property-search")
    .withDescription("Fast property search without advanced features")
    .use(createLoggingMiddleware({ logLevel: "warn" }))
    .addStage(createGoalParserStage())
    .addStage(createPropertySearchStage())
    .addStage(createDedupeRankStage({ maxResults: 10 }))
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      return {
        properties: state.propertyResults || [],
        metrics: {
          totalFound: state.propertyResults?.length || 0,
          duplicatesRemoved: 0,
          searchTime: Date.now() - context.metadata.startTime,
        },
      };
    })
    .build();
}

/**
 * Advanced property search with parallel analysis
 */
export function createAdvancedPropertySearchPipeline() {
  return (
    createPipeline<PropertySearchInput, AgentPipelineState>()
      .withName("advanced-property-search")
      .withDescription(
        "Property search with parallel graph and analytics analysis",
      )
      .use(createLoggingMiddleware({ logLevel: "info" }))
      .use(
        createMetricsMiddleware({
          onMetrics: (metrics) => {
            console.log("[Advanced Pipeline Metrics]", metrics);
          },
        }),
      )
      .use(createPerformanceMiddleware({ slowThreshold: 10000 }))
      .addStage(createGoalParserStage())
      .addStage(createPropertySearchStage())
      .addStage(createDedupeRankStage())
      // Parallel analysis stages would go here
      .addStage(createMapLinkStage())
      .stage("format-result", async (context) => {
        const state = context.state as AgentPipelineState;
        return {
          properties: state.propertyResults || [],
          mapLink: state.mapLink,
          analytics: state.analytics,
          graphData: state.graphResults,
          metrics: {
            totalFound: state.propertyResults?.length || 0,
            duplicatesRemoved: 0,
            searchTime: Date.now() - context.metadata.startTime,
          },
        };
      })
      .build()
  );
}

/**
 * Run a property search
 */
export async function runPropertySearch(
  goal: string,
  options?: {
    maxResults?: number;
    includeMap?: boolean;
    cacheResults?: boolean;
  },
): Promise<PropertySearchResult> {
  const pipeline = createPropertySearchPipeline(options);

  const result = await pipeline.execute({
    goal,
    maxResults: options?.maxResults,
    includeMap: options?.includeMap,
    cacheResults: options?.cacheResults,
  });

  if (!result.success) {
    throw new Error(`Property search failed: ${result.error?.message}`);
  }

  return result.output as unknown as PropertySearchResult;
}
