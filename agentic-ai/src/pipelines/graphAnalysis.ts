/**
 * Graph Analysis Pipeline
 *
 * Advanced graph-based property analysis using Neo4j for relationship
 * discovery, pattern matching, and network analysis.
 */

import {
  createPipeline,
  createGoalParserStage,
  createPropertySearchStage,
  createGraphAnalysisStage,
  createAnalyticsSummaryStage,
  createReportGenerationStage,
  createLoggingMiddleware,
  createMetricsMiddleware,
  createPerformanceMiddleware,
  createCachingMiddleware,
  type AgentPipelineState,
} from "../pipeline/index.js";

/**
 * Graph analysis input
 */
export interface GraphAnalysisInput {
  goal?: string;
  propertyIds?: string[];
  analysisType?:
    | "relationships"
    | "patterns"
    | "clustering"
    | "centrality"
    | "all";
  maxDepth?: number;
  includeVisualization?: boolean;
  includeReport?: boolean;
}

/**
 * Graph node
 */
export interface GraphNode {
  id: string;
  type:
    | "property"
    | "owner"
    | "agent"
    | "developer"
    | "neighborhood"
    | "school"
    | "amenity";
  label: string;
  properties: Record<string, unknown>;
}

/**
 * Graph edge
 */
export interface GraphEdge {
  from: string;
  to: string;
  type:
    | "owns"
    | "near"
    | "similar"
    | "managed_by"
    | "developed_by"
    | "services"
    | "connected";
  weight?: number;
  properties?: Record<string, unknown>;
}

/**
 * Graph pattern
 */
export interface GraphPattern {
  name: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  confidence: number;
}

/**
 * Graph analysis result
 */
export interface GraphAnalysisResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  patterns?: GraphPattern[];
  clusters?: Array<{
    id: string;
    nodes: string[];
    characteristics: Record<string, unknown>;
  }>;
  centrality?: Array<{
    nodeId: string;
    score: number;
    type: "degree" | "betweenness" | "closeness" | "eigenvector";
  }>;
  insights: string[];
  visualization?: {
    mermaid?: string;
    graphviz?: string;
    cytoscape?: unknown;
  };
  report?: string;
  metrics: {
    analysisTime: number;
    nodesAnalyzed: number;
    edgesAnalyzed: number;
    patternsFound: number;
  };
}

/**
 * Create a graph analysis pipeline
 */
export function createGraphAnalysisPipeline(options?: {
  enableLogging?: boolean;
  enableMetrics?: boolean;
  enableCaching?: boolean;
  enablePerformance?: boolean;
  analysisType?: GraphAnalysisInput["analysisType"];
}) {
  const builder = createPipeline<GraphAnalysisInput, AgentPipelineState>()
    .withName("graph-analysis")
    .withDescription(
      "Analyze property relationships and patterns using graph database",
    );

  // Add middleware
  if (options?.enableLogging !== false) {
    builder.use(createLoggingMiddleware({ logLevel: "info" }));
  }

  if (options?.enableMetrics !== false) {
    builder.use(
      createMetricsMiddleware({
        onMetrics: (metrics) => {
          console.log("[Metrics]", metrics);
        },
      }),
    );
  }

  if (options?.enablePerformance !== false) {
    builder.use(createPerformanceMiddleware({ slowThreshold: 10000 }));
  }

  if (options?.enableCaching) {
    builder.use(
      createCachingMiddleware({
        ttl: 600000, // 10 minutes
        keyGenerator: (context) => {
          const input = context.input as GraphAnalysisInput;
          return `graph-analysis:${input.analysisType || "all"}:${input.propertyIds?.join(",") || input.goal}`;
        },
      }),
    );
  }

  // Build pipeline stages
  return builder
    .conditional(
      (context) => !!(context.input as GraphAnalysisInput).goal,
      createGoalParserStage(),
    )
    .conditional(
      (context) => !!(context.input as GraphAnalysisInput).goal,
      createPropertySearchStage(),
    )
    .addStage(createGraphAnalysisStage())
    .addStage(createAnalyticsSummaryStage())
    .conditional(
      (context) =>
        (context.input as GraphAnalysisInput).includeReport !== false,
      createReportGenerationStage(),
    )
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      const input = context.input as GraphAnalysisInput;

      const graphData = (state.graphResults as any) || {};
      const result: GraphAnalysisResult = {
        nodes: graphData.nodes || [],
        edges: graphData.edges || [],
        patterns: graphData.patterns,
        clusters: graphData.clusters,
        centrality: graphData.centrality,
        insights: graphData.insights || [],
        visualization: input.includeVisualization
          ? {
              mermaid: graphData.visualization?.mermaid,
              graphviz: graphData.visualization?.graphviz,
              cytoscape: graphData.visualization?.cytoscape,
            }
          : undefined,
        report: state.report as string | undefined,
        metrics: {
          analysisTime: Date.now() - context.metadata.startTime,
          nodesAnalyzed: graphData.nodes?.length || 0,
          edgesAnalyzed: graphData.edges?.length || 0,
          patternsFound: graphData.patterns?.length || 0,
        },
      };

      return result;
    })
    .build();
}

/**
 * Create a relationship discovery pipeline
 */
export function createRelationshipDiscoveryPipeline() {
  return createPipeline<GraphAnalysisInput, AgentPipelineState>()
    .withName("relationship-discovery")
    .withDescription("Discover relationships between properties and entities")
    .use(createLoggingMiddleware({ logLevel: "info" }))
    .use(
      createMetricsMiddleware({
        onMetrics: (metrics) => {
          console.log("[Metrics]", metrics);
        },
      }),
    )
    .conditional(
      (context) => !!(context.input as GraphAnalysisInput).goal,
      createGoalParserStage(),
    )
    .conditional(
      (context) => !!(context.input as GraphAnalysisInput).goal,
      createPropertySearchStage(),
    )
    .addStage(createGraphAnalysisStage())
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      const graphData = (state.graphResults as any) || {};

      return {
        nodes: graphData.nodes || [],
        edges: graphData.edges || [],
        insights: graphData.insights || [],
        metrics: {
          analysisTime: Date.now() - context.metadata.startTime,
          nodesAnalyzed: graphData.nodes?.length || 0,
          edgesAnalyzed: graphData.edges?.length || 0,
          patternsFound: 0,
        },
      };
    })
    .build();
}

/**
 * Create a pattern matching pipeline
 */
export function createPatternMatchingPipeline() {
  return createPipeline<GraphAnalysisInput, AgentPipelineState>()
    .withName("pattern-matching")
    .withDescription("Identify common patterns in property data")
    .use(createLoggingMiddleware({ logLevel: "info" }))
    .use(
      createMetricsMiddleware({
        onMetrics: (metrics) => {
          console.log("[Metrics]", metrics);
        },
      }),
    )
    .use(
      createCachingMiddleware({
        ttl: 900000, // 15 minutes - patterns change slowly
      }),
    )
    .conditional(
      (context) => !!(context.input as GraphAnalysisInput).goal,
      createGoalParserStage(),
    )
    .conditional(
      (context) => !!(context.input as GraphAnalysisInput).goal,
      createPropertySearchStage(),
    )
    .addStage(createGraphAnalysisStage())
    .addStage(createAnalyticsSummaryStage())
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      const graphData = (state.graphResults as any) || {};

      return {
        patterns: graphData.patterns || [],
        insights: graphData.insights || [],
        analytics: state.analytics,
        metrics: {
          analysisTime: Date.now() - context.metadata.startTime,
          nodesAnalyzed: graphData.nodes?.length || 0,
          edgesAnalyzed: graphData.edges?.length || 0,
          patternsFound: graphData.patterns?.length || 0,
        },
      };
    })
    .build();
}

/**
 * Create a network clustering pipeline
 */
export function createNetworkClusteringPipeline() {
  return createPipeline<GraphAnalysisInput, AgentPipelineState>()
    .withName("network-clustering")
    .withDescription("Cluster properties based on network characteristics")
    .use(createLoggingMiddleware({ logLevel: "info" }))
    .use(
      createMetricsMiddleware({
        onMetrics: (metrics) => {
          console.log("[Metrics]", metrics);
        },
      }),
    )
    .conditional(
      (context) => !!(context.input as GraphAnalysisInput).goal,
      createGoalParserStage(),
    )
    .conditional(
      (context) => !!(context.input as GraphAnalysisInput).goal,
      createPropertySearchStage(),
    )
    .addStage(createGraphAnalysisStage())
    .addStage(createAnalyticsSummaryStage())
    .addStage(createReportGenerationStage())
    .stage("format-result", async (context) => {
      const state = context.state as AgentPipelineState;
      const graphData = (state.graphResults as any) || {};

      return {
        clusters: graphData.clusters || [],
        insights: graphData.insights || [],
        analytics: state.analytics,
        report: state.report,
        metrics: {
          analysisTime: Date.now() - context.metadata.startTime,
          nodesAnalyzed: graphData.nodes?.length || 0,
          edgesAnalyzed: graphData.edges?.length || 0,
          patternsFound: 0,
        },
      };
    })
    .build();
}

/**
 * Run a graph analysis
 */
export async function runGraphAnalysis(
  input: GraphAnalysisInput,
): Promise<GraphAnalysisResult> {
  const pipeline = createGraphAnalysisPipeline({
    enableLogging: true,
    enableMetrics: true,
    enableCaching: true,
    analysisType: input.analysisType || "all",
  });

  const result = await pipeline.execute(input);

  if (!result.success) {
    throw new Error(`Graph analysis failed: ${result.error?.message}`);
  }

  return result.output as unknown as GraphAnalysisResult;
}

/**
 * Discover relationships
 */
export async function discoverRelationships(
  propertyIds: string[],
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[]; insights: string[] }> {
  const pipeline = createRelationshipDiscoveryPipeline();

  const result = await pipeline.execute({ propertyIds });

  if (!result.success) {
    throw new Error(`Relationship discovery failed: ${result.error?.message}`);
  }

  const output = result.output as any;
  return {
    nodes: output.nodes,
    edges: output.edges,
    insights: output.insights,
  };
}

/**
 * Find patterns
 */
export async function findPatterns(
  goal: string,
): Promise<{ patterns: GraphPattern[]; insights: string[] }> {
  const pipeline = createPatternMatchingPipeline();

  const result = await pipeline.execute({ goal });

  if (!result.success) {
    throw new Error(`Pattern matching failed: ${result.error?.message}`);
  }

  const output = result.output as any;
  return {
    patterns: output.patterns,
    insights: output.insights,
  };
}
