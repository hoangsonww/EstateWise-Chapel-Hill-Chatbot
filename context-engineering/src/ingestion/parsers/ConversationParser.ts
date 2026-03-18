/**
 * @fileoverview Parser for conversation data (chat history, agent dialogues).
 *
 * Converts an array of chat messages into a Conversation graph node,
 * linking edges to mentioned properties and concepts, and a KB document
 * built from the full conversation transcript.
 */

import type {
  IngestionPipeline,
  IngestionSource,
  ParsedData,
} from "../types.js";

/** Shape of a single message within a conversation payload. */
interface ConversationMessage {
  role?: string;
  content?: string;
  text?: string;
  timestamp?: string;
}

/** Shape of the raw conversation object accepted by this parser. */
interface RawConversation {
  id?: string;
  sessionId?: string;
  title?: string;
  messages?: ConversationMessage[];
  participants?: string[];
  createdAt?: string;
  [key: string]: unknown;
}

/** Extracts text from a message regardless of which field it uses. */
function messageText(msg: ConversationMessage): string {
  return (msg.content ?? msg.text ?? "").trim();
}

/**
 * Scans message text for patterns that look like Zillow Property IDs.
 * A ZPID is a run of 6–12 digits that is not part of a longer number.
 */
function extractZpids(text: string): string[] {
  const matches = text.match(/\b\d{6,12}\b/g) ?? [];
  return [...new Set(matches)];
}

/**
 * Extracts simple concepts: capitalised multi-word phrases (Title Case).
 * Returns up to 10 unique matches to avoid noise.
 */
function extractConcepts(text: string): string[] {
  const matches = text.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)+)\b/g) ?? [];
  return [...new Set(matches)].slice(0, 10);
}

/**
 * Parses conversation payloads into Conversation graph nodes and KB documents.
 *
 * Produces:
 *   - One `Conversation` node
 *   - `MENTIONS` edges from the Conversation to any detected Property nodes (by ZPID)
 *   - `RELATED_TO` edges from the Conversation to extracted Concept nodes
 *   - One KB document containing the full transcript
 */
export class ConversationParser implements IngestionPipeline {
  readonly name = "ConversationParser";

  async parse(source: IngestionSource): Promise<ParsedData> {
    const conv = source.data as RawConversation;

    const convId = conv.id ?? conv.sessionId ?? `conv-${Date.now()}`;
    const convLabel = `Conversation:${convId}`;
    const messages: ConversationMessage[] = conv.messages ?? [];

    // Build full transcript text
    const transcript = messages
      .map((m) => {
        const role = (m.role ?? "unknown").padEnd(10);
        return `[${role}] ${messageText(m)}`;
      })
      .join("\n");

    const fullText = [conv.title ? `Title: ${conv.title}` : "", transcript]
      .filter(Boolean)
      .join("\n\n");

    const nodes: ParsedData["nodes"] = [];
    const edges: ParsedData["edges"] = [];

    // ----- Conversation node -----
    nodes.push({
      type: "Conversation",
      label: convLabel,
      importance: 0.65,
      properties: {
        conversationId: convId,
        title: conv.title ?? "",
        messageCount: messages.length,
        participants: conv.participants ?? [],
        createdAt: conv.createdAt ?? new Date().toISOString(),
        ...source.metadata,
      },
    });

    // ----- MENTIONS edges to referenced properties -----
    const zpids = extractZpids(transcript);
    for (const zpid of zpids.slice(0, 20)) {
      const propertyLabel = `Property:${zpid}`;
      // We don't create the Property node here — it may already exist.
      // The edge will only be persisted if the Ingester can resolve both labels.
      edges.push({
        sourceLabel: convLabel,
        targetLabel: propertyLabel,
        type: "MENTIONS",
        weight: 0.8,
        properties: { zpid },
      });
    }

    // ----- RELATED_TO edges to extracted concepts -----
    const concepts = extractConcepts(transcript);
    for (const concept of concepts) {
      const conceptLabel = `Concept:${concept}`;
      nodes.push({
        type: "Concept",
        label: conceptLabel,
        importance: 0.4,
        properties: { name: concept, origin: "conversation" },
      });
      edges.push({
        sourceLabel: convLabel,
        targetLabel: conceptLabel,
        type: "RELATED_TO",
        weight: 0.6,
      });
    }

    // ----- KB document -----
    const documents: ParsedData["documents"] = [
      {
        title: conv.title ?? `Conversation ${convId}`,
        content: fullText,
        source: `conversation:${convId}`,
        sourceType: "conversation",
        tags: ["conversation", ...(conv.participants ?? [])],
      },
    ];

    return { nodes, edges, documents };
  }
}
