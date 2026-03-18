/**
 * @fileoverview Barrel export for the EstateWise Knowledge Base package.
 *
 * Re-exports all public types, the Embedder, Retriever, and the main
 * KnowledgeBase class so consumers can import from a single path.
 *
 * @example
 * ```typescript
 * import { KnowledgeBase, Embedder, type SearchOptions } from "./knowledge-base/index.js";
 * ```
 */

export { Embedder } from "./Embedder.js";
export { Retriever } from "./Retriever.js";
export { KnowledgeBase } from "./KnowledgeBase.js";
export type {
  KBDocument,
  KBChunk,
  DocumentMetadata,
  SearchOptions,
  SearchFilter,
  SearchResult,
  EmbedderConfig,
  EmbedFunction,
} from "./types.js";
