import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { getCostTrackingCallbacks } from "../costs/langchain.js";
import { buildLangSmithModelConfig, initializeLangSmith } from "./langsmith.js";

export type ChatModel = ChatOpenAI | ChatGoogleGenerativeAI;
const GEMINI_EMBEDDING_DIMENSIONS = 768;

export interface ChatModelOptions {
  deterministic?: boolean;
  temperature?: number;
  topP?: number;
}

class FixedDimensionGoogleGenerativeAIEmbeddings extends GoogleGenerativeAIEmbeddings {
  private buildEmbeddingRequest(
    text: string,
    taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
  ) {
    const cleanedText = this.stripNewLines ? text.replace(/\n/g, " ") : text;
    return {
      content: {
        role: "user",
        parts: [{ text: cleanedText }],
      },
      taskType,
      title: taskType === "RETRIEVAL_DOCUMENT" ? this.title : undefined,
      outputDimensionality: GEMINI_EMBEDDING_DIMENSIONS,
    } as const;
  }

  private assertEmbeddingDimensions(embedding: number[]) {
    if (embedding.length !== GEMINI_EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected ${GEMINI_EMBEDDING_DIMENSIONS}-dimensional embedding, received ${embedding.length}.`,
      );
    }
    return embedding;
  }

  override async embedQuery(document: string): Promise<number[]> {
    return this.caller.call(async (text: string) => {
      const response = await (this as any).client.embedContent(
        this.buildEmbeddingRequest(text, "RETRIEVAL_QUERY"),
      );
      return this.assertEmbeddingDimensions(response.embedding?.values ?? []);
    }, document);
  }

  override async embedDocuments(documents: string[]): Promise<number[][]> {
    return this.caller.call(async (docs: string[]) => {
      const batches: string[][] = [];
      for (let i = 0; i < docs.length; i += this.maxBatchSize) {
        batches.push(docs.slice(i, i + this.maxBatchSize));
      }

      const responses = await Promise.allSettled(
        batches.map((batch) =>
          (this as any).client.batchEmbedContents({
            requests: batch.map((doc) =>
              this.buildEmbeddingRequest(doc, "RETRIEVAL_DOCUMENT"),
            ),
          }),
        ),
      );

      return responses.flatMap((result, index) => {
        if (result.status === "fulfilled") {
          return result.value.embeddings.map((embedding: any) =>
            this.assertEmbeddingDimensions(embedding.values ?? []),
          );
        }
        return Array.from({ length: batches[index].length }, () => []);
      });
    }, documents);
  }
}

/** Select a chat LLM (Google Gemini preferred) from env. */
export function getChatModel(options: ChatModelOptions = {}): ChatModel {
  initializeLangSmith({ runtime: "langgraph", surface: "langgraph" });
  const { GOOGLE_AI_API_KEY, OPENAI_API_KEY } = process.env as Record<
    string,
    string | undefined
  >;
  const deterministic = !!options.deterministic;
  const defaultTemperature = deterministic ? 0 : 0.2;
  const resolvedTemperature =
    options.temperature ?? Number(process.env.AGENT_CHAT_TEMPERATURE);
  const temperature = Number.isFinite(resolvedTemperature as number)
    ? Number(resolvedTemperature)
    : defaultTemperature;
  const resolvedTopP = options.topP ?? Number(process.env.AGENT_CHAT_TOP_P);
  const topP = Number.isFinite(resolvedTopP as number)
    ? Number(resolvedTopP)
    : undefined;
  const callbacks = getCostTrackingCallbacks();
  const tracingConfig = buildLangSmithModelConfig({
    runtime: "langgraph",
    surface: "langgraph",
    component: "chat-model",
  });
  if (GOOGLE_AI_API_KEY) {
    const model = process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
    return new ChatGoogleGenerativeAI({
      apiKey: GOOGLE_AI_API_KEY,
      model,
      temperature,
      ...(topP != null ? { topP } : {}),
      callbacks,
      tags: tracingConfig.tags,
      metadata: tracingConfig.metadata,
    });
  }
  if (OPENAI_API_KEY) {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    return new ChatOpenAI({
      apiKey: OPENAI_API_KEY,
      model,
      temperature,
      ...(topP != null ? { topP } : {}),
      callbacks,
      tags: tracingConfig.tags,
      metadata: tracingConfig.metadata,
    });
  }
  throw new Error("Missing GOOGLE_AI_API_KEY or OPENAI_API_KEY for chat model");
}

export function getChatModelName(): string {
  const { GOOGLE_AI_API_KEY, OPENAI_API_KEY } = process.env as Record<
    string,
    string | undefined
  >;
  if (GOOGLE_AI_API_KEY)
    return process.env.GOOGLE_AI_MODEL || "gemini-2.5-flash";
  if (OPENAI_API_KEY) return process.env.OPENAI_MODEL || "gpt-4o-mini";
  return process.env.GOOGLE_AI_MODEL || process.env.OPENAI_MODEL || "unknown";
}

/** Select an embeddings model matching the chosen provider. */
export function getEmbeddings() {
  initializeLangSmith({ runtime: "langgraph", surface: "langgraph" });
  const { GOOGLE_AI_API_KEY, OPENAI_API_KEY } = process.env as Record<
    string,
    string | undefined
  >;
  if (GOOGLE_AI_API_KEY) {
    const model = process.env.GOOGLE_EMBED_MODEL || "gemini-embedding-001";
    return new FixedDimensionGoogleGenerativeAIEmbeddings({
      apiKey: GOOGLE_AI_API_KEY,
      model,
    });
  }
  if (OPENAI_API_KEY) {
    const model = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-large";
    return new OpenAIEmbeddings({
      apiKey: OPENAI_API_KEY,
      model,
    });
  }
  throw new Error("Missing GOOGLE_AI_API_KEY or OPENAI_API_KEY for embeddings");
}

export function getEmbeddingModelName(): string {
  const { GOOGLE_AI_API_KEY, OPENAI_API_KEY } = process.env as Record<
    string,
    string | undefined
  >;
  if (GOOGLE_AI_API_KEY) {
    return process.env.GOOGLE_EMBED_MODEL || "gemini-embedding-001";
  }
  if (OPENAI_API_KEY) {
    return process.env.OPENAI_EMBED_MODEL || "text-embedding-3-large";
  }
  return (
    process.env.GOOGLE_EMBED_MODEL ||
    process.env.OPENAI_EMBED_MODEL ||
    "unknown"
  );
}
