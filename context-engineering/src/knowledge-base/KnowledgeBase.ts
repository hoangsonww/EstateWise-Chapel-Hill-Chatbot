/**
 * @fileoverview Core Knowledge Base implementation for the EstateWise platform.
 *
 * Manages documents and their embedding-backed chunks, exposes multi-strategy
 * search, and auto-seeds itself with comprehensive real-estate domain content
 * on first use so the knowledge base is never empty.
 */

import { randomUUID } from "crypto";
import { Embedder } from "./Embedder.js";
import { Retriever } from "./Retriever.js";
import type {
  KBDocument,
  KBChunk,
  DocumentMetadata,
  SearchOptions,
  SearchResult,
} from "./types.js";

/** Approximate tokens per word (GPT-family tokenisers average ~1.3). */
const TOKENS_PER_WORD = 1.3;
/** Target chunk size in tokens before splitting. */
const CHUNK_SIZE_TOKENS = 500;
/** Overlap between consecutive chunks in tokens. */
const CHUNK_OVERLAP_TOKENS = 50;
/** Maximum number of characters kept per chunk (used as safety cap). */
const MAX_CHUNK_CHARS = 2000;

/** Serialised snapshot of the knowledge base for persistence. */
interface KBSnapshot {
  version: number;
  documents: KBDocument[];
  exportedAt: string;
}

/**
 * In-memory knowledge base for EstateWise AI agents.
 *
 * Documents are auto-chunked on ingestion, each chunk receives an embedding
 * vector, and retrieval supports semantic, keyword, and hybrid strategies.
 * The base seeds itself with ten domain-specific reference documents on first
 * use so agents always have foundational real-estate knowledge available.
 *
 * @example
 * ```typescript
 * const kb = new KnowledgeBase();
 * await kb.initialize();
 *
 * const results = await kb.search("3-bedroom homes near downtown", {
 *   strategy: "hybrid",
 *   limit: 5,
 * });
 * ```
 */
export class KnowledgeBase {
  private readonly documents = new Map<string, KBDocument>();
  private readonly chunksByDoc = new Map<string, KBChunk[]>();
  private readonly embedder: Embedder;
  private readonly retriever: Retriever;
  private initialized = false;

  constructor(embedder?: Embedder) {
    this.embedder = embedder ?? new Embedder();
    this.retriever = new Retriever();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Initialises the knowledge base. Must be called before any search or add
   * operations. Seeds domain content if the base is empty.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    if (this.documents.size === 0) {
      await this.seed();
    }
  }

  // ---------------------------------------------------------------------------
  // Document CRUD
  // ---------------------------------------------------------------------------

  /**
   * Adds a new document, auto-chunks the content, generates embeddings for
   * each chunk, and returns the fully populated KBDocument.
   *
   * @param doc - Document fields excluding auto-generated id, chunks, and timestamps.
   * @returns The stored KBDocument with chunks and embeddings attached.
   */
  async addDocument(
    doc: Omit<KBDocument, "id" | "chunks" | "createdAt" | "updatedAt">,
  ): Promise<KBDocument> {
    const id = randomUUID();
    const now = new Date().toISOString();

    const rawChunks = this._chunkContent(doc.content, id);
    const chunkTexts = rawChunks.map((c) => c.content);
    const embeddings = await this.embedder.embedBatch(chunkTexts);

    const chunks: KBChunk[] = rawChunks.map((c, idx) => ({
      ...c,
      embedding: embeddings[idx],
    }));

    const document: KBDocument = {
      id,
      ...doc,
      chunks,
      createdAt: now,
      updatedAt: now,
    };

    this.documents.set(id, document);
    this.chunksByDoc.set(id, chunks);
    return document;
  }

  /**
   * Removes a document and all its chunks from the knowledge base.
   *
   * @param id - Document ID to remove.
   * @returns `true` if the document existed and was removed, `false` otherwise.
   */
  removeDocument(id: string): boolean {
    if (!this.documents.has(id)) return false;
    this.documents.delete(id);
    this.chunksByDoc.delete(id);
    return true;
  }

  /**
   * Retrieves a document by its ID.
   *
   * @param id - Document ID.
   * @returns The document if found, otherwise `undefined`.
   */
  getDocument(id: string): KBDocument | undefined {
    return this.documents.get(id);
  }

  /**
   * Applies shallow updates to an existing document's fields and refreshes
   * chunks/embeddings if the content changed.
   *
   * @param id      - Document ID to update.
   * @param updates - Partial document fields to merge in.
   * @returns The updated document, or `undefined` if not found.
   */
  async updateDocument(
    id: string,
    updates: Partial<Omit<KBDocument, "id" | "createdAt">>,
  ): Promise<KBDocument | undefined> {
    const existing = this.documents.get(id);
    if (!existing) return undefined;

    const now = new Date().toISOString();

    // If content has changed we must re-chunk and re-embed.
    let chunks = existing.chunks;
    if (updates.content !== undefined && updates.content !== existing.content) {
      const rawChunks = this._chunkContent(updates.content, id);
      const embeddings = await this.embedder.embedBatch(
        rawChunks.map((c) => c.content),
      );
      chunks = rawChunks.map((c, idx) => ({
        ...c,
        embedding: embeddings[idx],
      }));
      this.chunksByDoc.set(id, chunks);
    }

    const updated: KBDocument = {
      ...existing,
      ...updates,
      id,
      chunks,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    this.documents.set(id, updated);
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  /**
   * Searches the knowledge base using the specified retrieval strategy and
   * returns ranked results.
   *
   * @param query   - Natural-language search query.
   * @param options - Retrieval configuration. Defaults to hybrid, limit 10.
   * @returns Ranked array of matching chunks and their parent documents.
   */
  async search(
    query: string,
    options?: Partial<SearchOptions>,
  ): Promise<SearchResult[]> {
    const strategy = options?.strategy ?? "hybrid";
    const limit = options?.limit ?? 10;
    const allChunks = this._allChunks();

    // Update access counters for returned documents after search (lazy approach).
    const doSearch = async (): Promise<SearchResult[]> => {
      switch (strategy) {
        case "semantic": {
          const embedding = await this.embedder.embed(query);
          return this.retriever.semanticSearch(
            embedding,
            allChunks,
            this.documents,
            limit,
            options,
          );
        }
        case "keyword": {
          return this.retriever.keywordSearch(
            query,
            allChunks,
            this.documents,
            limit,
            options,
          );
        }
        case "graph_enhanced":
        case "hybrid":
        default: {
          const embedding = await this.embedder.embed(query);
          return this.retriever.hybridSearch(
            query,
            embedding,
            allChunks,
            this.documents,
            limit,
            0.65,
            options,
          );
        }
      }
    };

    const results = await doSearch();

    // Track access metadata.
    const now = new Date().toISOString();
    const seenDocIds = new Set<string>();
    for (const r of results) {
      if (!seenDocIds.has(r.document.id)) {
        seenDocIds.add(r.document.id);
        const doc = this.documents.get(r.document.id);
        if (doc) {
          doc.metadata.accessCount += 1;
          doc.metadata.lastAccessedAt = now;
        }
      }
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * Returns all documents whose `sourceType` matches the given value.
   *
   * @param sourceType - Source type string to filter by.
   * @returns Array of matching KBDocuments.
   */
  getDocumentsBySource(sourceType: string): KBDocument[] {
    return Array.from(this.documents.values()).filter(
      (d) => d.sourceType === sourceType,
    );
  }

  /**
   * Returns aggregate statistics about the knowledge base.
   */
  getStats(): {
    documentCount: number;
    chunkCount: number;
    totalTokens: number;
    sourceBreakdown: Record<string, number>;
  } {
    let chunkCount = 0;
    let totalTokens = 0;
    const sourceBreakdown: Record<string, number> = {};

    for (const doc of this.documents.values()) {
      chunkCount += doc.chunks.length;
      for (const chunk of doc.chunks) {
        totalTokens += chunk.tokenCount;
      }
      sourceBreakdown[doc.sourceType] =
        (sourceBreakdown[doc.sourceType] ?? 0) + 1;
    }

    return {
      documentCount: this.documents.size,
      chunkCount,
      totalTokens,
      sourceBreakdown,
    };
  }

  // ---------------------------------------------------------------------------
  // Serialisation
  // ---------------------------------------------------------------------------

  /**
   * Serialises the entire knowledge base to a plain JSON-compatible object.
   */
  toJSON(): KBSnapshot {
    return {
      version: 1,
      documents: Array.from(this.documents.values()),
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Restores the knowledge base from a previously serialised snapshot.
   * Existing documents are cleared before loading.
   *
   * @param data - Snapshot object produced by `toJSON()`.
   */
  fromJSON(data: object): void {
    const snapshot = data as KBSnapshot;
    if (!Array.isArray(snapshot.documents)) {
      throw new Error(
        "Invalid knowledge base snapshot: missing documents array.",
      );
    }

    this.documents.clear();
    this.chunksByDoc.clear();

    for (const doc of snapshot.documents) {
      this.documents.set(doc.id, doc);
      this.chunksByDoc.set(doc.id, doc.chunks);
    }

    this.initialized = true;
  }

  // ---------------------------------------------------------------------------
  // Seeding
  // ---------------------------------------------------------------------------

  /**
   * Populates the knowledge base with ten foundational EstateWise domain
   * documents. Called automatically during `initialize()` when the base is
   * empty. Safe to call manually to reset seed content.
   */
  async seed(): Promise<void> {
    const seedDocs = this._buildSeedDocuments();
    for (const doc of seedDocs) {
      await this.addDocument(doc);
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Aggregates all chunks across every document into a single flat array. */
  private _allChunks(): KBChunk[] {
    const result: KBChunk[] = [];
    for (const chunks of this.chunksByDoc.values()) {
      result.push(...chunks);
    }
    return result;
  }

  /**
   * Splits document content into overlapping chunks of approximately
   * CHUNK_SIZE_TOKENS tokens (words × 1.3) with CHUNK_OVERLAP_TOKENS overlap.
   */
  private _chunkContent(
    content: string,
    documentId: string,
  ): Array<Omit<KBChunk, "embedding">> {
    const words = content.split(/\s+/).filter(Boolean);
    const wordsPerChunk = Math.floor(CHUNK_SIZE_TOKENS / TOKENS_PER_WORD);
    const overlapWords = Math.floor(CHUNK_OVERLAP_TOKENS / TOKENS_PER_WORD);

    if (words.length === 0) {
      return [];
    }

    // If the whole document fits in one chunk, return it as-is.
    if (words.length <= wordsPerChunk) {
      const text = words.join(" ");
      return [
        {
          id: randomUUID(),
          documentId,
          content: text.slice(0, MAX_CHUNK_CHARS),
          position: 0,
          tokenCount: Math.ceil(words.length * TOKENS_PER_WORD),
          metadata: {},
        },
      ];
    }

    const chunks: Array<Omit<KBChunk, "embedding">> = [];
    let start = 0;
    let position = 0;

    while (start < words.length) {
      const end = Math.min(start + wordsPerChunk, words.length);
      const chunkWords = words.slice(start, end);
      const text = chunkWords.join(" ").slice(0, MAX_CHUNK_CHARS);

      chunks.push({
        id: randomUUID(),
        documentId,
        content: text,
        position: position++,
        tokenCount: Math.ceil(chunkWords.length * TOKENS_PER_WORD),
        metadata: {},
      });

      // Slide forward by chunk size minus overlap.
      start += wordsPerChunk - overlapWords;
      if (start >= words.length) break;
    }

    return chunks;
  }

  /** Builds a default DocumentMetadata object. */
  private _meta(tags: string[], author = "system"): DocumentMetadata {
    return {
      author,
      tags,
      language: "en",
      accessCount: 0,
    };
  }

  /** Returns the ten seed documents for the EstateWise domain. */
  private _buildSeedDocuments(): Array<
    Omit<KBDocument, "id" | "chunks" | "createdAt" | "updatedAt">
  > {
    return [
      // -----------------------------------------------------------------------
      // 1. Platform Overview
      // -----------------------------------------------------------------------
      {
        title: "EstateWise Platform Overview",
        sourceType: "system",
        source: "seed/platform-overview",
        metadata: this._meta([
          "platform",
          "overview",
          "capabilities",
          "agents",
        ]),
        content: `EstateWise is an enterprise-grade AI-powered real estate intelligence platform that combines large language models, knowledge graphs, multi-agent orchestration, and comprehensive property data to deliver actionable insights for buyers, sellers, investors, and real estate professionals.

The platform is built on a microservices architecture with five primary layers: (1) a REST + tRPC backend API that handles property search, user authentication, conversation management, and forum discussions; (2) a Next.js web frontend with interactive maps, market dashboards, and AI chat; (3) an MCP (Model Context Protocol) server exposing over 60 specialised tools to AI agents; (4) an agentic AI runtime running LangGraph-based multi-agent workflows; and (5) a Neo4j knowledge graph connecting properties, neighbourhoods, schools, employers, and market trends.

Core capabilities include natural-language property search with semantic understanding, real-time market analysis using gRPC-streamed data, neighbourhood scoring across 12 dimensions, commute time optimisation, mortgage and ROI calculators, fair-housing compliance monitoring, and portfolio analytics for investors. The platform serves queries through a conversational interface where users can ask questions like "Find me a 3-bedroom home under $450,000 near good schools in Raleigh" and receive ranked, explainable results with supporting evidence.

Agent roles within the platform include the Orchestrator (decomposes goals and coordinates agents), the GraphAnalyst (queries the Neo4j knowledge graph), the PropertyAnalyst (deep-dives individual properties), the MarketAnalyst (interprets market trends and pricing), the NeighbourhoodExpert (scores livability factors), and the ComplianceChecker (validates against fair-housing rules). Each agent uses a curated set of MCP tools and shares context through the knowledge graph and this knowledge base.

Integration points include Zillow ZPID property identifiers, Google Maps for geocoding and commute, government datasets for school and crime statistics, MLS listing feeds, and financial market data for investment analysis. The platform prioritises explainability: every recommendation includes the reasoning chain, data sources, confidence scores, and alternative options.`,
      },

      // -----------------------------------------------------------------------
      // 2. Property Search Guide
      // -----------------------------------------------------------------------
      {
        title: "Property Search Guide",
        sourceType: "system",
        source: "seed/property-search-guide",
        metadata: this._meta([
          "property",
          "search",
          "filters",
          "zpid",
          "listings",
        ]),
        content: `EstateWise supports multiple property search modalities: natural-language queries, structured filter search, map-based bounding-box search, and ZPID (Zillow Property ID) direct lookup.

Natural-language search processes user intent using the LLM to extract implicit constraints such as budget range, bedroom count, school quality preference, commute destination, and neighbourhood character. The extracted parameters are normalised and passed to the structured search engine. Queries like "walkable neighbourhood, 2-car garage, good for families" are decomposed into quantifiable filters.

Structured filters available include: price range (min/max), bedroom count (exact or range), bathroom count, square footage (living area and lot), year built range, property type (single-family, condo, townhouse, multi-family, land), listing status (for sale, recently sold, for rent, off-market), days on market, price reduction flag, HOA fee range, and school district name or rating. Multiple filters combine with AND logic; OR logic is supported within a single filter type.

ZPID lookup provides instant access to a specific property record including current listing details, historical price changes, Zestimate valuation, comparable sales, tax history, and permit records. ZPIDs are stable Zillow identifiers and can be used across all platform tools.

Map-based search accepts a GeoJSON bounding box or polygon drawn by the user and returns all properties within the boundary matching any active filters. Results are clustered at zoom levels below street level to maintain performance. Clicking a cluster expands to individual listings.

Search results are ranked by a proprietary relevance model that weighs price-to-value ratio, match quality against stated preferences, neighbourhood score, school ratings, and recency of listing. Users can override ranking and sort by price, square footage, price per square foot, days on market, or estimated ROI for investor mode. Results include a confidence percentage indicating how well the property matches the user's stated requirements.`,
      },

      // -----------------------------------------------------------------------
      // 3. Market Analysis Methodology
      // -----------------------------------------------------------------------
      {
        title: "Market Analysis Methodology",
        sourceType: "system",
        source: "seed/market-analysis-methodology",
        metadata: this._meta([
          "market",
          "analysis",
          "metrics",
          "data-sources",
          "pricing",
        ]),
        content: `EstateWise market analysis synthesises data from five primary sources: MLS transaction records, public county assessor records, Zillow Research API, Census ACS 5-year estimates, and proprietary agent activity signals.

Key market metrics computed in real time include: median sold price, price per square foot (PPSF), months of supply (active listings ÷ monthly absorption rate), list-to-sale price ratio, days on market (DOM) median and 90th percentile, new listing volume, pending-to-active ratio (a leading indicator of demand), and foreclosure rate. Metrics are available at the ZIP code, city, county, metro area, and national level with weekly refresh cadence.

Market condition classification uses a rules engine: seller's market (months supply < 3 AND pending-to-active > 60%), balanced market (3–6 months supply), buyer's market (> 6 months supply OR DOM > 90 days). Each market is also classified for price trend: appreciating (> 5% YoY), stable (0–5% YoY), or depreciating (< 0% YoY).

Comparative Market Analysis (CMA) selects comparable sales (comps) using a weighted similarity score across: square footage (within 20%), bedroom and bathroom count (exact match preferred), year built (within 10 years), lot size (within 25%), style (within same category), and distance (within 0.5 miles preferred, up to 2 miles). Each comp receives a similarity weight and the final estimated value is a weighted median of adjusted comp prices.

Price forecasting uses an ensemble of a gradient-boosted model trained on 10 years of transaction history, a seasonal decomposition model, and macroeconomic factor inputs (mortgage rates, employment, permits). Forecasts are provided at 3-month, 6-month, and 12-month horizons with confidence intervals. The forecast model is retrained quarterly.

The gRPC market-pulse service streams live price signal updates, allowing the Market Pulse dashboard to reflect intraday changes to listing inventory and pending sales without polling.`,
      },

      // -----------------------------------------------------------------------
      // 4. Financial Analysis Tools
      // -----------------------------------------------------------------------
      {
        title: "Financial Analysis Tools",
        sourceType: "system",
        source: "seed/financial-analysis-tools",
        metadata: this._meta([
          "financial",
          "mortgage",
          "roi",
          "affordability",
          "investment",
        ]),
        content: `EstateWise provides a comprehensive suite of financial analysis tools accessible both through the chat interface and the dedicated Insights page.

The mortgage calculator computes monthly payment, total interest paid, amortisation schedule, and break-even horizon for refinancing. Inputs include purchase price, down payment (dollar or percentage), loan term (10, 15, 20, 25, 30 years), interest rate (fixed or ARM with adjustment caps), property tax rate, homeowners insurance rate, and PMI (if down payment < 20%). The calculator also shows the impact of extra monthly principal payments and the tax deduction benefit of mortgage interest (optional, jurisdiction-aware).

Affordability analysis determines the maximum purchase price a buyer can afford given annual gross income, existing monthly debt obligations, credit score tier, and target debt-to-income ratio (DTI). The standard guideline is a front-end DTI ≤ 28% (housing costs) and back-end DTI ≤ 36–43% (all debt). The tool outputs a price range, recommended down payment savings target, and time-to-purchase estimate at given savings rates.

Return on Investment (ROI) analysis covers both primary residence and investment property scenarios. For investment properties the analysis includes: gross rent multiplier (GRM), cap rate (NOI ÷ purchase price), cash-on-cash return, net present value at a chosen discount rate, internal rate of return over a projected hold period, and appreciation-inclusive total return. Vacancy rate, property management fees, maintenance reserve, and capital expenditure reserves are configurable.

The rent-vs-buy comparison uses the New York Times rent-vs-buy model adapted for any market: it accounts for opportunity cost of the down payment, transaction costs (3–6% closing costs, 5–6% agent commissions), annual appreciation, rent escalation, and investment return on alternative assets. Output is the break-even years after which buying becomes cheaper than renting at a given rent level.

Portfolio analytics aggregates across multiple owned or tracked properties to show total equity, monthly cash flow, portfolio cap rate, geographic concentration risk, and projected net worth at 5, 10, and 20-year horizons.`,
      },

      // -----------------------------------------------------------------------
      // 5. Graph & Knowledge System
      // -----------------------------------------------------------------------
      {
        title: "Graph & Knowledge System",
        sourceType: "system",
        source: "seed/graph-knowledge-system",
        metadata: this._meta([
          "graph",
          "neo4j",
          "knowledge-graph",
          "nodes",
          "relationships",
        ]),
        content: `The EstateWise Knowledge Graph is a Neo4j property graph database that serves as the semantic backbone connecting all platform entities into an interconnected web of real estate knowledge.

Node types in the graph include: Property (individual listings with all MLS attributes), Neighbourhood (geographic and administrative boundaries with livability scores), City and County (administrative hierarchy), School (K-12 with GreatSchools ratings), SchoolDistrict (district-level boundaries and performance), Employer (major employers with job count and industry), TransitStop (bus stops, train stations, light rail), Amenity (grocery, hospital, park, restaurant, gym), MarketTrend (time-series snapshots of market metrics), Agent (real estate professionals with transaction history), and Concept (abstract real-estate concepts used for semantic linking).

Key relationship types include: LOCATED_IN (Property→Neighbourhood), ASSIGNED_TO (Property→SchoolDistrict), WITHIN_DISTANCE (bidirectional, with distance_miles and travel_time_minutes properties), COMPARABLE_TO (Property→Property, with similarity_score), BORDERS (Neighbourhood→Neighbourhood), EMPLOYS (Employer→City), SERVED_BY (Property→TransitStop), and INFLUENCES_PRICE (Amenity or Employer→Neighbourhood).

The graph enables queries that relational databases handle poorly: "find properties within 30-minute commute of Downtown Raleigh AND within the Jordan Lake school district AND near a Whole Foods" requires traversing three relationship types with constraint filtering — a natural Cypher query but a multi-join SQL nightmare.

PageRank scores are computed weekly for Property and Neighbourhood nodes, using connection density and relationship weights as input. High PageRank neighbourhoods are those well-connected to employers, good schools, transit, and amenities — a quantitative proxy for desirability. These scores are surfaced in search ranking and neighbourhood comparison tools.

The knowledge graph is also the memory layer for multi-agent conversations: the Orchestrator writes session context nodes and REFERENCED edges during each turn so agents can pick up mid-conversation context without re-reading the full history. Graph nodes have an "embedding" property allowing vector-similarity queries directly in Cypher via the Neo4j vector index.`,
      },

      // -----------------------------------------------------------------------
      // 6. Agent Capabilities Reference
      // -----------------------------------------------------------------------
      {
        title: "Agent Capabilities Reference",
        sourceType: "system",
        source: "seed/agent-capabilities-reference",
        metadata: this._meta([
          "agents",
          "orchestrator",
          "planner",
          "graph-analyst",
          "property-analyst",
        ]),
        content: `EstateWise runs a LangGraph-based multi-agent runtime with six specialised agents that collaborate through a shared message queue and the knowledge graph.

The Orchestrator Agent acts as the session controller. It receives user goals, decomposes them into sub-tasks, assigns sub-tasks to specialist agents, aggregates results, resolves conflicts, and generates the final user-facing response. It uses a plan-then-execute pattern with reflection loops: if a specialist returns low-confidence results the Orchestrator may re-query with refined parameters or invoke an additional specialist.

The GraphAnalyst Agent is responsible for all Neo4j interactions. It translates natural-language queries into Cypher, executes graph traversals, interprets PageRank and centrality scores, and summarises relationship patterns. It is the primary agent for neighbourhood connectivity questions, commute routing, and finding comparable properties via graph similarity.

The PropertyAnalyst Agent performs deep analysis of individual properties. It retrieves full property records via ZPID, analyses price history, generates CMA reports, identifies renovation opportunities, estimates carrying costs, and compares the property against portfolio targets. It uses financial analysis tools and comparable-sales tools from MCP.

The MarketAnalyst Agent interprets aggregate market conditions. It analyses market metrics (DOM, months supply, PPSF trends), identifies market turning points, compares submarkets, and provides pricing guidance for buyers and sellers. It subscribes to the gRPC market-pulse stream for real-time data.

The NeighbourhoodExpert Agent evaluates neighbourhood livability. It scores neighbourhoods across 12 dimensions: walkability, transit access, school quality, safety, green space, noise levels, job proximity, dining and entertainment, healthcare access, air quality, flood risk, and future development pipeline. Scores are aggregated into an overall Livability Index (0–100).

The ComplianceChecker Agent validates that all platform outputs and agent recommendations comply with the Fair Housing Act, Equal Credit Opportunity Act, and applicable state regulations. It screens for redlining patterns, discriminatory language, and prohibited steering behaviour. All public-facing recommendations pass through this agent before delivery.`,
      },

      // -----------------------------------------------------------------------
      // 7. MCP Tool Reference
      // -----------------------------------------------------------------------
      {
        title: "MCP Tool Reference",
        sourceType: "system",
        source: "seed/mcp-tool-reference",
        metadata: this._meta([
          "mcp",
          "tools",
          "api",
          "functions",
          "capabilities",
        ]),
        content: `The EstateWise MCP (Model Context Protocol) server exposes 60+ tools organised into eight functional categories.

Property Tools: search_properties (multi-filter property search), get_property_by_zpid (full property record by ZPID), get_property_history (price and listing history), get_property_tax_history, get_property_permits, get_comparable_sales (CMA comps), calculate_zestimate (AVM valuation), get_property_images, get_virtual_tour_url, save_property_to_watchlist, get_watchlist.

Market Analysis Tools: get_market_overview (city/ZIP market metrics), get_price_trends (time-series PPSF and volume), get_market_heat_map, get_absorption_rate, get_days_on_market_stats, get_list_to_sale_ratio, get_foreclosure_data, get_new_construction_pipeline, get_luxury_market_report, get_investment_market_report.

Neighbourhood Tools: score_neighbourhood (12-dimension livability score), get_school_ratings (GreatSchools data by address or district), get_crime_statistics (FBI UCR crime data by neighbourhood), get_demographics (Census ACS data), get_nearby_amenities (Google Places), get_noise_levels, get_flood_risk, get_air_quality, compare_neighbourhoods (side-by-side scoring), get_neighbourhood_trends.

Financial Tools: calculate_mortgage_payment, calculate_affordability, calculate_roi, calculate_cap_rate, calculate_cash_on_cash, run_rent_vs_buy_analysis, get_interest_rate_data, calculate_closing_costs, estimate_property_taxes, get_hoa_fee_data.

Graph Tools: query_knowledge_graph (raw Cypher), get_property_graph_context, find_similar_properties (graph embedding search), get_neighbourhood_connections, get_employment_centres, traverse_school_districts, get_transit_connections, run_pagerank_query, get_graph_overview, get_graph_visualisation_data.

Commute Tools: calculate_commute_time (driving, transit, cycling, walking), get_commute_score, find_properties_by_commute (reverse: max commute → property search), get_traffic_patterns, get_transit_routes.

Web Grounding Tools: search_real_estate_news, get_regulatory_updates, fetch_public_record, verify_property_claim, get_market_commentary.

System & Monitoring Tools: get_token_usage, get_agent_status, get_session_context, write_session_context, get_kb_stats, search_knowledge_base, add_kb_document, get_performance_metrics.`,
      },

      // -----------------------------------------------------------------------
      // 8. Neighbourhood Analysis Guide
      // -----------------------------------------------------------------------
      {
        title: "Neighbourhood Analysis Guide",
        sourceType: "system",
        source: "seed/neighbourhood-analysis-guide",
        metadata: this._meta([
          "neighbourhood",
          "schools",
          "crime",
          "livability",
          "scoring",
        ]),
        content: `EstateWise neighbourhood analysis delivers a multi-dimensional livability assessment drawing on seven distinct data sources to give buyers and investors a comprehensive view of where a property is located.

The Livability Index is a composite score from 0 to 100 computed from 12 sub-scores, each weighted by user preference profile or platform defaults: Walkability (Walk Score API, 15% default weight), Transit Access (Transit Score, 10%), School Quality (GreatSchools ratings averaged across elementary, middle, and high school, 20%), Safety (FBI UCR Part I crime rate normalised per 1,000 residents, 15%), Green Space (park area per capita within 1 mile, 5%), Noise Levels (FAA flight path and road traffic noise decibel estimates, 5%), Job Proximity (employment within 30-minute commute radius, 10%), Amenity Access (grocery, healthcare, dining density, 8%), Air Quality (EPA AQI annual average, 4%), Flood Risk (FEMA flood zone classification, 4%), Future Development (planned permits and zoning changes, 2%), and Community Vitality (population growth and business formation rate, 2%).

School data from GreatSchools is updated annually and includes overall summary rating (1–10), test score rating, student progress rating, equity rating, and distance from subject property. Ratings are provided for every school within the assigned district boundary plus opt-choice schools within 5 miles. School district boundaries are stored as GeoJSON polygons in the knowledge graph.

Crime statistics use FBI Uniform Crime Report Part I crime categories: violent crime (homicide, rape, robbery, assault) and property crime (burglary, larceny-theft, motor vehicle theft, arson). Rates are normalised per 1,000 residents and benchmarked against city, state, and national averages. Crime heat maps in the frontend use kernel density estimation over incident point data.

Demographic data from Census ACS 5-year estimates includes population, median age, household income distribution, educational attainment, owner vs. renter ratio, housing unit age distribution, and vacancy rate. These factors correlate with neighbourhood stability and long-term price appreciation.

The NeighbourhoodExpert agent can compare up to six neighbourhoods simultaneously, generate a ranked table of sub-scores, highlight trade-offs, and provide a plain-language narrative summary suitable for client reports.`,
      },

      // -----------------------------------------------------------------------
      // 9. Commute Analysis
      // -----------------------------------------------------------------------
      {
        title: "Commute Analysis",
        sourceType: "system",
        source: "seed/commute-analysis",
        metadata: this._meta([
          "commute",
          "transportation",
          "transit",
          "scoring",
          "routing",
        ]),
        content: `Commute analysis is a first-class feature in EstateWise, reflecting research showing commute time is among the top three decision factors for home buyers. The platform supports four transportation modes: driving (peak and off-peak), public transit, cycling, and walking.

Commute times are computed using the Google Maps Distance Matrix API with traffic modelling. Driving commutes are evaluated at three time windows: morning peak (7–9 AM, Mon–Fri), evening peak (4–7 PM, Mon–Fri), and off-peak baseline. The Commute Score blends these: 40% morning peak, 40% evening peak, 20% off-peak. A score of 100 represents a ≤15-minute commute; the score decays exponentially to 0 at 90 minutes.

Transit commutes factor in walk-to-stop time, wait time (using GTFS real-time feeds), in-vehicle time, and transfers. Reliability is scored separately using on-time performance data from transit agencies where available. Transit scores below 25 typically indicate car-dependent commutes.

The reverse commute search tool (find_properties_by_commute) accepts a destination address, transportation mode, maximum commute time (minutes), and maximum acceptable commute cost (fuel + tolls for driving or transit fare). It returns a geographic isochrone polygon and searches all active listings within that boundary. This dramatically simplifies house hunting for buyers with a fixed workplace.

Commute cost estimation for driving uses average fuel economy (22 MPG default, adjustable), local fuel price (updated weekly), and toll data from HERE Maps. Annual commute cost is surfaced in property comparison cards so buyers can factor it into total cost of ownership.

Multi-destination commuting is supported for dual-income households: both destinations are entered and the tool finds properties where neither commute exceeds the stated limits, showing the Pareto frontier of optimal locations that minimise the sum of both commute times.

Future commute scenarios account for announced transit expansions stored in the knowledge graph. If a light rail station is planned within 0.5 miles of a property, the platform flags this as a positive development indicator.`,
      },

      // -----------------------------------------------------------------------
      // 10. Compliance & Regulations
      // -----------------------------------------------------------------------
      {
        title: "Compliance & Regulations",
        sourceType: "system",
        source: "seed/compliance-regulations",
        metadata: this._meta([
          "compliance",
          "fair-housing",
          "regulations",
          "privacy",
          "legal",
        ]),
        content: `EstateWise is built with regulatory compliance as a foundational requirement, not an afterthought. The platform addresses three primary regulatory domains: Fair Housing, data privacy, and financial advertising compliance.

The Fair Housing Act (FHA) prohibits discrimination in the sale, rental, or financing of housing based on race, colour, national origin, religion, sex, familial status, or disability. The Americans with Disabilities Act (ADA) and state equivalents add additional protected categories in many jurisdictions. EstateWise enforces FHA compliance through: (1) the ComplianceChecker agent that screens all generated content, (2) prohibition of neighbourhood descriptions referencing protected class composition, (3) consistent presentation of all properties to all users regardless of demographic inference, and (4) audit logging of search result sets for pattern analysis.

Prohibited practices the platform actively prevents include racial or ethnic steering (directing buyers toward or away from neighbourhoods based on protected class), redlining (systematically excluding neighbourhoods from recommendations), discriminatory advertising (using language that indicates preference for or against protected classes), and disparate impact in algorithmic recommendations (facially neutral practices that disproportionately affect protected groups).

Data privacy compliance covers CCPA (California), VCDPA (Virginia), CPA (Colorado), and GDPR for EU users. Personal data handling follows data minimisation principles: only data necessary for the service is collected, stored, and processed. Users may request data export, correction, or deletion through the platform settings. Conversation history is retained for 90 days by default (configurable). Property search history is used only for personalisation within the active session unless the user opts into long-term preference learning.

Financial advertising compliance (RESPA, TILA, Regulation Z, Regulation B) requires that mortgage and financing information display APR alongside interest rate, include required disclosures for ARMS, and avoid deceptive marketing of credit terms. The platform's financial tools include boilerplate disclosure text that satisfies Reg Z requirements and is reviewed quarterly by legal counsel.

All compliance rule sets are versioned in the knowledge graph and the ComplianceChecker agent is pinged whenever rule sets are updated, ensuring recommendations stay current with regulatory changes without requiring a platform redeployment.`,
      },
    ];
  }
}
