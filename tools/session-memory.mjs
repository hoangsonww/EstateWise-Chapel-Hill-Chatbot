#!/usr/bin/env node

/**
 * CASS-lite Session Memory System
 *
 * Three-layer memory architecture that turns raw session history into
 * operational knowledge, following the Flywheel methodology.
 *
 * Layer 1: Episodic Memory  — raw session event logs (JSONL, append-only)
 * Layer 2: Working Memory   — structured session summaries (JSON)
 * Layer 3: Procedural Memory — distilled rules with confidence scoring (JSON)
 *
 * Zero external dependencies. Node.js >= 18.
 *
 * Usage: node tools/session-memory.mjs <command> [options]
 */

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { createHash, randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = resolve(import.meta.dirname, "..");
const STORE = join(ROOT, ".beads", "session-memory");
const EPISODIC_DIR = join(STORE, "episodic");
const WORKING_DIR = join(STORE, "working");
const PROCEDURAL_DIR = join(STORE, "procedural");
const INDEX_PATH = join(STORE, "index.json");
const RULES_PATH = join(PROCEDURAL_DIR, "rules.json");

const VALID_EVENT_TYPES = [
  "task-start",
  "task-complete",
  "task-fail",
  "decision",
  "discovery",
  "workaround",
  "error",
  "review",
  "handoff",
];

const HALF_LIFE_DAYS = 90;
const HARMFUL_MULTIPLIER = 4;
const MIN_CONFIDENCE = 0.01;
const MAX_CONFIDENCE = 0.99;
const INITIAL_CONFIDENCE = 0.5;
const HELPFUL_DELTA = 0.1;
const HARMFUL_DELTA = HELPFUL_DELTA * HARMFUL_MULTIPLIER; // 0.4

const RULE_STAGES = /** @type {const} */ ({
  CANDIDATE: "candidate",
  ESTABLISHED: "established",
  PROVEN: "proven",
});

// ---------------------------------------------------------------------------
// ANSI helpers (respects NO_COLOR / dumb terminal)
// ---------------------------------------------------------------------------

const NO_COLOR = !!process.env.NO_COLOR || process.env.TERM === "dumb";

const c = {
  reset: NO_COLOR ? "" : "\x1b[0m",
  bold: NO_COLOR ? "" : "\x1b[1m",
  dim: NO_COLOR ? "" : "\x1b[2m",
  red: NO_COLOR ? "" : "\x1b[31m",
  green: NO_COLOR ? "" : "\x1b[32m",
  yellow: NO_COLOR ? "" : "\x1b[33m",
  blue: NO_COLOR ? "" : "\x1b[34m",
  cyan: NO_COLOR ? "" : "\x1b[36m",
  magenta: NO_COLOR ? "" : "\x1b[35m",
  gray: NO_COLOR ? "" : "\x1b[90m",
};

// ---------------------------------------------------------------------------
// Global flags
// ---------------------------------------------------------------------------

let JSON_OUTPUT = false;

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function ensureDirs() {
  for (const dir of [STORE, EPISODIC_DIR, WORKING_DIR, PROCEDURAL_DIR]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
  if (!existsSync(join(STORE, ".gitkeep"))) {
    writeFileSync(join(STORE, ".gitkeep"), "");
  }
}

/** Safe JSON parse — returns fallback on any error. */
function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

/** Read a JSON file, returning fallback if missing or corrupt. */
function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return safeJsonParse(readFileSync(path, "utf-8"), fallback);
  } catch {
    return fallback;
  }
}

/** Write JSON file atomically (overwrite). */
function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** Append a single JSONL line. */
function appendJsonl(path, obj) {
  appendFileSync(path, JSON.stringify(obj) + "\n", "utf-8");
}

/** Read all lines from a JSONL file, skipping corrupt lines. */
function readJsonl(path) {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, "utf-8").split("\n").filter(Boolean);
  const result = [];
  for (const line of lines) {
    const parsed = safeJsonParse(line, null);
    if (parsed) result.push(parsed);
  }
  return result;
}

// ---------------------------------------------------------------------------
// ID generators
// ---------------------------------------------------------------------------

function evtId() {
  return `evt-${randomUUID().slice(0, 12)}`;
}

function sesId() {
  return `ses-${randomUUID().slice(0, 12)}`;
}

function diaryId() {
  return `diary-${randomUUID().slice(0, 12)}`;
}

function ruleId(text) {
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 10);
  return `rule-${hash}`;
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function isoNow() {
  return new Date().toISOString();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(isoString) {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  return Math.max(0, (now - then) / (1000 * 60 * 60 * 24));
}

function relativeTime(isoString) {
  const days = daysAgo(isoString);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 7) return `${Math.floor(days)}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

/** Apply half-life decay to a confidence value. */
function decayConfidence(confidence, lastReinforcedAt) {
  const days = daysAgo(lastReinforcedAt);
  const decayFactor = Math.pow(0.5, days / HALF_LIFE_DAYS);
  return Math.max(MIN_CONFIDENCE, confidence * decayFactor);
}

/** Determine stage from effective confidence. */
function computeStage(confidence) {
  if (confidence >= 0.8) return RULE_STAGES.PROVEN;
  if (confidence >= 0.6) return RULE_STAGES.ESTABLISHED;
  return RULE_STAGES.CANDIDATE;
}

// ---------------------------------------------------------------------------
// Search index
// ---------------------------------------------------------------------------

/** Rebuild the full-text search index from all stored data. */
function rebuildIndex() {
  const index = { episodic: [], working: [], procedural: [] };

  // Index episodic events
  const episodicFiles = safeReaddirSync(EPISODIC_DIR).filter((f) => f.endsWith(".jsonl"));
  for (const file of episodicFiles) {
    const events = readJsonl(join(EPISODIC_DIR, file));
    for (const evt of events) {
      index.episodic.push({
        id: evt.id,
        sessionId: evt.sessionId,
        agent: evt.agent,
        type: evt.type,
        text: `${evt.description || ""} ${(evt.tags || []).join(" ")} ${evt.agent || ""}`.toLowerCase(),
        timestamp: evt.timestamp,
        file,
      });
    }
  }

  // Index working memory
  const workingFiles = safeReaddirSync(WORKING_DIR).filter((f) => f.endsWith(".json"));
  for (const file of workingFiles) {
    const entry = readJson(join(WORKING_DIR, file), null);
    if (!entry) continue;
    const text = [
      entry.summary || "",
      ...(entry.decisions || []),
      ...(entry.discoveries || []),
      ...(entry.workarounds || []),
      entry.agent || "",
      ...(entry.beadsCompleted || []),
    ]
      .join(" ")
      .toLowerCase();
    index.working.push({
      id: entry.id,
      sessionId: entry.sessionId,
      agent: entry.agent,
      date: entry.date,
      text,
      file,
    });
  }

  // Index procedural rules
  const rules = readJson(RULES_PATH, []);
  for (const rule of rules) {
    index.procedural.push({
      id: rule.id,
      text: `${rule.rule} ${(rule.tags || []).join(" ")} ${rule.category || ""}`.toLowerCase(),
      confidence: rule.confidence,
      lastReinforcedAt: rule.lastReinforcedAt,
    });
  }

  writeJson(INDEX_PATH, index);
  return index;
}

function safeReaddirSync(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/** Simple keyword search scoring. Returns relevance 0-1. */
function keywordScore(text, query) {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);
  if (queryTerms.length === 0) return 0;
  let matched = 0;
  for (const term of queryTerms) {
    if (text.includes(term)) matched++;
  }
  return matched / queryTerms.length;
}

// ---------------------------------------------------------------------------
// Session tracking
// ---------------------------------------------------------------------------

/** Get or create today's session ID for an agent. */
function getSessionId(agent) {
  const sessionFile = join(STORE, ".current-sessions.json");
  const sessions = readJson(sessionFile, {});
  const key = `${todayDate()}-${agent}`;
  if (!sessions[key]) {
    sessions[key] = sesId();
    writeJson(sessionFile, sessions);
  }
  return sessions[key];
}

// ---------------------------------------------------------------------------
// Layer 1: Episodic Memory
// ---------------------------------------------------------------------------

function cmdLog(args) {
  // Clone args so we can mutate safely for flag extraction
  const mutableArgs = [...args];

  // Extract optional flags BEFORE building the description
  const beadId = extractFlag(mutableArgs, "--bead") || null;
  const filesArg = extractFlag(mutableArgs, "--files");
  const tagsArg = extractFlag(mutableArgs, "--tags");

  const agent = mutableArgs[0];
  const eventType = mutableArgs[1];
  const description = mutableArgs.slice(2).join(" ");

  if (!agent) return die("Usage: session-memory log <agent> <event-type> <description>");
  if (!eventType) return die("Usage: session-memory log <agent> <event-type> <description>");
  if (!VALID_EVENT_TYPES.includes(eventType)) {
    return die(`Invalid event type: ${eventType}\nValid types: ${VALID_EVENT_TYPES.join(", ")}`);
  }
  if (!description) return die("Description is required");

  ensureDirs();
  const sessionId = getSessionId(agent);
  const date = todayDate();
  const filePath = join(EPISODIC_DIR, `${date}-${agent}.jsonl`);

  const event = {
    id: evtId(),
    sessionId,
    agent,
    timestamp: isoNow(),
    type: eventType,
    description,
    beadId,
    files: filesArg ? filesArg.split(",").map((f) => f.trim()) : [],
    tags: tagsArg ? tagsArg.split(",").map((t) => t.trim()) : [],
  };

  appendJsonl(filePath, event);

  if (JSON_OUTPUT) {
    output(event);
  } else {
    print(`${c.green}✓${c.reset} Logged ${c.cyan}${eventType}${c.reset} event for ${c.bold}${agent}${c.reset}`);
    print(`  ${c.dim}ID: ${event.id} | Session: ${sessionId}${c.reset}`);
    print(`  ${c.dim}${description}${c.reset}`);
  }
}

function cmdLogFile(args) {
  const filePath = args[0];
  if (!filePath) return die("Usage: session-memory log-file <path>");

  const absPath = resolve(filePath);
  if (!existsSync(absPath)) return die(`File not found: ${absPath}`);

  ensureDirs();

  const content = readFileSync(absPath, "utf-8");
  const lines = content.split("\n").filter(Boolean);
  let imported = 0;
  let skipped = 0;

  for (const line of lines) {
    const event = safeJsonParse(line, null);
    if (!event || !event.agent || !event.type) {
      skipped++;
      continue;
    }

    // Ensure required fields
    if (!event.id) event.id = evtId();
    if (!event.sessionId) event.sessionId = getSessionId(event.agent);
    if (!event.timestamp) event.timestamp = isoNow();

    const date = event.timestamp.slice(0, 10);
    const dest = join(EPISODIC_DIR, `${date}-${event.agent}.jsonl`);
    appendJsonl(dest, event);
    imported++;
  }

  if (JSON_OUTPUT) {
    output({ imported, skipped, source: absPath });
  } else {
    print(`${c.green}✓${c.reset} Imported ${c.bold}${imported}${c.reset} events (${skipped} skipped)`);
  }
}

// ---------------------------------------------------------------------------
// Layer 2: Working Memory
// ---------------------------------------------------------------------------

function cmdSummarize(args) {
  ensureDirs();

  const sessionFlag = extractFlag(args, "--session");
  const isToday = args.includes("--today");

  // Gather episodic events
  let events = [];
  const files = safeReaddirSync(EPISODIC_DIR).filter((f) => f.endsWith(".jsonl"));

  if (sessionFlag) {
    // Filter by session ID
    for (const file of files) {
      const fileEvents = readJsonl(join(EPISODIC_DIR, file));
      events.push(...fileEvents.filter((e) => e.sessionId === sessionFlag));
    }
  } else if (isToday) {
    const today = todayDate();
    for (const file of files) {
      if (file.startsWith(today)) {
        events.push(...readJsonl(join(EPISODIC_DIR, file)));
      }
    }
  } else {
    // All events from last session file
    if (files.length === 0) return die("No episodic events found. Log some events first.");
    const latest = files.sort().pop();
    events = readJsonl(join(EPISODIC_DIR, latest));
  }

  if (events.length === 0) return die("No events found matching the criteria.");

  // Group by session
  const sessions = new Map();
  for (const evt of events) {
    const sid = evt.sessionId || "unknown";
    if (!sessions.has(sid)) sessions.set(sid, []);
    sessions.get(sid).push(evt);
  }

  const diaries = [];

  for (const [sid, sessionEvents] of sessions) {
    const sorted = sessionEvents.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const agent = sorted[0].agent || "unknown";
    const date = sorted[0].timestamp.slice(0, 10);

    // Extract structured information
    const decisions = sorted.filter((e) => e.type === "decision").map((e) => e.description);
    const discoveries = sorted.filter((e) => e.type === "discovery").map((e) => e.description);
    const workarounds = sorted.filter((e) => e.type === "workaround").map((e) => e.description);
    const beadsCompleted = sorted
      .filter((e) => e.type === "task-complete" && e.beadId)
      .map((e) => e.beadId);
    const filesModified = [...new Set(sorted.flatMap((e) => e.files || []))];

    // Build summary from events
    const taskStarts = sorted.filter((e) => e.type === "task-start");
    const taskCompletes = sorted.filter((e) => e.type === "task-complete");
    const errors = sorted.filter((e) => e.type === "error" || e.type === "task-fail");

    let summary = "";
    if (taskCompletes.length > 0) {
      summary = taskCompletes.map((e) => e.description).join("; ");
    } else if (taskStarts.length > 0) {
      summary = `In progress: ${taskStarts.map((e) => e.description).join("; ")}`;
    } else {
      summary = sorted.map((e) => e.description).slice(0, 3).join("; ");
    }

    // Estimate duration
    const first = new Date(sorted[0].timestamp);
    const last = new Date(sorted[sorted.length - 1].timestamp);
    const durationMs = last.getTime() - first.getTime();
    const durationMin = Math.round(durationMs / 60000);
    const duration =
      durationMin >= 60
        ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
        : `${durationMin}m`;

    const diary = {
      id: diaryId(),
      sessionId: sid,
      date,
      agent,
      summary,
      decisions,
      discoveries,
      workarounds,
      beadsCompleted,
      filesModified,
      duration,
      eventCount: sorted.length,
      errors: errors.map((e) => e.description),
      tokenEstimate: {
        input: sorted.length * 1000,
        output: sorted.length * 300,
      },
    };

    // Write diary entry
    const diaryPath = join(WORKING_DIR, `${diary.id}.json`);
    writeJson(diaryPath, diary);
    diaries.push(diary);
  }

  // Rebuild index
  rebuildIndex();

  if (JSON_OUTPUT) {
    output(diaries);
  } else {
    print(`${c.green}✓${c.reset} Generated ${c.bold}${diaries.length}${c.reset} diary ${diaries.length === 1 ? "entry" : "entries"}\n`);
    for (const d of diaries) {
      printDiaryCompact(d);
    }
  }
}

function cmdDiary(args) {
  ensureDirs();

  if (args[0] === "show") {
    return cmdDiaryShow(args.slice(1));
  }

  const files = safeReaddirSync(WORKING_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse()
    .slice(0, 20);

  if (files.length === 0) {
    return die("No diary entries found. Run 'summarize' first.");
  }

  const entries = files
    .map((f) => readJson(join(WORKING_DIR, f), null))
    .filter(Boolean)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (JSON_OUTPUT) {
    output(entries);
  } else {
    print(`${c.bold}Working Memory — Recent Diary Entries${c.reset}\n`);
    for (const entry of entries) {
      printDiaryCompact(entry);
    }
  }
}

function cmdDiaryShow(args) {
  const entryId = args[0];
  if (!entryId) return die("Usage: session-memory diary show <entry-id>");

  const files = safeReaddirSync(WORKING_DIR).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const entry = readJson(join(WORKING_DIR, file), null);
    if (entry && entry.id === entryId) {
      if (JSON_OUTPUT) {
        output(entry);
      } else {
        printDiaryFull(entry);
      }
      return;
    }
  }

  die(`Diary entry not found: ${entryId}`);
}

// ---------------------------------------------------------------------------
// Layer 3: Procedural Memory
// ---------------------------------------------------------------------------

function cmdReflect(_args) {
  ensureDirs();

  // Gather recent working memory entries (last 30 days)
  const files = safeReaddirSync(WORKING_DIR).filter((f) => f.endsWith(".json"));
  const entries = files
    .map((f) => readJson(join(WORKING_DIR, f), null))
    .filter(Boolean)
    .filter((e) => daysAgo(e.date || "1970-01-01") <= 30)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  if (entries.length === 0) {
    return die("No recent diary entries to reflect on. Run 'summarize' first.");
  }

  const existingRules = readJson(RULES_PATH, []);
  const existingRuleTexts = new Set(existingRules.map((r) => r.rule.toLowerCase()));

  // Distill patterns from working memory
  const newRules = [];

  // Pattern 1: Repeated discoveries become rules
  const allDiscoveries = entries.flatMap((e) => e.discoveries || []);
  const discoveryFreq = countFrequency(allDiscoveries);
  for (const [discovery, count] of Object.entries(discoveryFreq)) {
    if (count >= 2 && !existingRuleTexts.has(discovery.toLowerCase())) {
      newRules.push(createRule(discovery, "discovery", entries));
    }
  }

  // Pattern 2: Repeated workarounds become rules
  const allWorkarounds = entries.flatMap((e) => e.workarounds || []);
  const workaroundFreq = countFrequency(allWorkarounds);
  for (const [workaround, count] of Object.entries(workaroundFreq)) {
    if (count >= 2 && !existingRuleTexts.has(workaround.toLowerCase())) {
      newRules.push(createRule(`Workaround: ${workaround}`, "workaround", entries));
    }
  }

  // Pattern 3: Repeated decisions become rules
  const allDecisions = entries.flatMap((e) => e.decisions || []);
  const decisionFreq = countFrequency(allDecisions);
  for (const [decision, count] of Object.entries(decisionFreq)) {
    if (count >= 2 && !existingRuleTexts.has(decision.toLowerCase())) {
      newRules.push(createRule(decision, "workflow", entries));
    }
  }

  // Pattern 4: Repeated errors become warning rules
  const allErrors = entries.flatMap((e) => e.errors || []);
  const errorFreq = countFrequency(allErrors);
  for (const [error, count] of Object.entries(errorFreq)) {
    if (count >= 2 && !existingRuleTexts.has(`avoid: ${error}`.toLowerCase())) {
      newRules.push(createRule(`Avoid: ${error}`, "error-prevention", entries));
    }
  }

  // Pattern 5: If no patterns found but entries exist, distill unique discoveries/decisions
  if (newRules.length === 0 && entries.length > 0) {
    // Promote unique but notable entries (single occurrence but from recent sessions)
    const recentDiscoveries = entries
      .slice(0, 5)
      .flatMap((e) => e.discoveries || [])
      .filter((d) => !existingRuleTexts.has(d.toLowerCase()));

    for (const d of recentDiscoveries.slice(0, 3)) {
      newRules.push(createRule(d, "discovery", entries));
    }
  }

  // Merge with existing rules
  const merged = [...existingRules, ...newRules];
  writeJson(RULES_PATH, merged);
  rebuildIndex();

  if (JSON_OUTPUT) {
    output({ newRules: newRules.length, totalRules: merged.length, rules: newRules });
  } else {
    if (newRules.length === 0) {
      print(`${c.yellow}○${c.reset} No new patterns found. ${existingRules.length} existing rules unchanged.`);
    } else {
      print(`${c.green}✓${c.reset} Distilled ${c.bold}${newRules.length}${c.reset} new rules (${merged.length} total)\n`);
      for (const rule of newRules) {
        printRuleCompact(rule);
      }
    }
  }
}

function createRule(text, category, entries) {
  const now = isoNow();
  const tags = extractTags(text);
  const relevantSessions = entries
    .filter((e) => {
      const all = [...(e.decisions || []), ...(e.discoveries || []), ...(e.workarounds || []), ...(e.errors || [])];
      return all.some((item) => item.toLowerCase().includes(text.toLowerCase().slice(0, 20)));
    })
    .map((e) => e.sessionId);

  return {
    id: ruleId(text),
    rule: text,
    category,
    confidence: INITIAL_CONFIDENCE,
    evidence: relevantSessions.slice(0, 5).map((sid) => ({
      sessionId: sid,
      type: "observed",
      reason: "Distilled from session reflection",
      date: todayDate(),
    })),
    createdAt: now,
    lastReinforcedAt: now,
    halfLifeDays: HALF_LIFE_DAYS,
    harmfulMultiplier: HARMFUL_MULTIPLIER,
    stage: RULE_STAGES.CANDIDATE,
    tags,
  };
}

function cmdRules(args) {
  ensureDirs();

  const minConfidence = parseFloat(extractFlag(args, "--min-confidence") || "0");
  const rules = readJson(RULES_PATH, []);

  if (rules.length === 0) {
    return die("No procedural rules found. Run 'reflect' first.");
  }

  // Apply decay and filter
  const processed = rules
    .map((rule) => {
      const effective = decayConfidence(rule.confidence, rule.lastReinforcedAt);
      return { ...rule, effectiveConfidence: effective, stage: computeStage(effective) };
    })
    .filter((r) => r.effectiveConfidence >= minConfidence)
    .sort((a, b) => b.effectiveConfidence - a.effectiveConfidence);

  if (JSON_OUTPUT) {
    output(processed);
  } else {
    print(`${c.bold}Procedural Rules${c.reset} ${c.dim}(${processed.length} rules)${c.reset}\n`);
    for (const rule of processed) {
      printRuleCompact(rule);
    }
  }
}

function cmdMark(args) {
  ensureDirs();

  const ruleIdArg = args[0];
  if (!ruleIdArg) return die("Usage: session-memory mark <rule-id> --helpful|--harmful [--reason <text>]");

  const isHelpful = args.includes("--helpful");
  const isHarmful = args.includes("--harmful");
  if (!isHelpful && !isHarmful) return die("Must specify --helpful or --harmful");
  if (isHelpful && isHarmful) return die("Cannot be both --helpful and --harmful");

  const reason = extractFlag(args, "--reason") || "";

  const rules = readJson(RULES_PATH, []);
  const idx = rules.findIndex((r) => r.id === ruleIdArg);
  if (idx === -1) return die(`Rule not found: ${ruleIdArg}`);

  const rule = rules[idx];
  const now = isoNow();

  // Apply confidence change
  if (isHelpful) {
    rule.confidence = Math.min(MAX_CONFIDENCE, rule.confidence + HELPFUL_DELTA);
  } else {
    rule.confidence = Math.max(MIN_CONFIDENCE, rule.confidence - HARMFUL_DELTA);
  }

  rule.lastReinforcedAt = now;
  rule.stage = computeStage(rule.confidence);

  // Add evidence
  rule.evidence.push({
    sessionId: null,
    type: isHelpful ? "helpful" : "harmful",
    reason,
    date: todayDate(),
  });

  rules[idx] = rule;
  writeJson(RULES_PATH, rules);
  rebuildIndex();

  if (JSON_OUTPUT) {
    output(rule);
  } else {
    const marker = isHelpful ? `${c.green}▲ helpful${c.reset}` : `${c.red}▼ harmful${c.reset}`;
    print(`${marker} — ${c.bold}${rule.rule}${c.reset}`);
    print(`  Confidence: ${formatConfidence(rule.confidence)} → ${rule.stage}`);
    if (reason) print(`  Reason: ${reason}`);
  }
}

// ---------------------------------------------------------------------------
// Context & Recall
// ---------------------------------------------------------------------------

function cmdContext(args) {
  ensureDirs();

  const query = args.join(" ");
  if (!query) return die("Usage: session-memory context <description>");

  const index = readJson(INDEX_PATH, null) || rebuildIndex();
  const results = [];

  // Search procedural rules
  const rules = readJson(RULES_PATH, []);
  for (const rule of rules) {
    const text = `${rule.rule} ${(rule.tags || []).join(" ")} ${rule.category || ""}`.toLowerCase();
    const relevance = keywordScore(text, query);
    if (relevance > 0) {
      const effective = decayConfidence(rule.confidence, rule.lastReinforcedAt);
      results.push({
        type: "rule",
        id: rule.id,
        content: rule.rule,
        category: rule.category,
        confidence: effective,
        stage: computeStage(effective),
        score: relevance * effective,
        tags: rule.tags,
      });
    }
  }

  // Search working memory
  for (const entry of index.working || []) {
    const relevance = keywordScore(entry.text, query);
    if (relevance > 0) {
      const fullEntry = readJson(join(WORKING_DIR, entry.file), null);
      results.push({
        type: "diary",
        id: entry.id,
        content: fullEntry ? fullEntry.summary : entry.text,
        agent: entry.agent,
        date: entry.date,
        score: relevance * 0.8, // Slightly lower weight than rules
        decisions: fullEntry ? fullEntry.decisions : [],
        discoveries: fullEntry ? fullEntry.discoveries : [],
      });
    }
  }

  // Search episodic memory
  for (const entry of index.episodic || []) {
    const relevance = keywordScore(entry.text, query);
    if (relevance > 0.3) {
      // Higher threshold for raw events to reduce noise
      results.push({
        type: "event",
        id: entry.id,
        content: entry.text,
        agent: entry.agent,
        eventType: entry.type,
        timestamp: entry.timestamp,
        score: relevance * 0.5, // Lower weight for raw events
      });
    }
  }

  // Sort by score, take top 10
  results.sort((a, b) => b.score - a.score);
  const top = results.slice(0, 10);

  if (JSON_OUTPUT) {
    output({ query, results: top, totalMatches: results.length });
  } else {
    if (top.length === 0) {
      print(`${c.yellow}○${c.reset} No relevant memories found for: ${c.dim}${query}${c.reset}`);
      return;
    }

    print(`${c.bold}Context for:${c.reset} ${query}`);
    print(`${c.dim}${results.length} matches, showing top ${top.length}${c.reset}\n`);

    for (const r of top) {
      const scoreBar = formatScore(r.score);
      if (r.type === "rule") {
        const confStr = formatConfidence(r.confidence);
        print(`  ${c.magenta}RULE${c.reset} ${scoreBar} ${confStr} ${c.bold}${r.content}${c.reset}`);
        if (r.tags && r.tags.length > 0) {
          print(`       ${c.dim}tags: ${r.tags.join(", ")}${c.reset}`);
        }
      } else if (r.type === "diary") {
        print(`  ${c.blue}DIARY${c.reset} ${scoreBar} ${c.dim}${r.date}${c.reset} ${r.content}`);
        if (r.decisions && r.decisions.length > 0) {
          print(`        ${c.dim}decisions: ${r.decisions.slice(0, 2).join("; ")}${c.reset}`);
        }
      } else {
        print(`  ${c.gray}EVENT${c.reset} ${scoreBar} ${c.dim}${relativeTime(r.timestamp)}${c.reset} [${r.eventType}] ${r.content.slice(0, 100)}`);
      }
    }
  }
}

function cmdRecall(args) {
  ensureDirs();

  const query = args.join(" ");
  if (!query) return die("Usage: session-memory recall <query>");

  // Search across all episodic events
  const files = safeReaddirSync(EPISODIC_DIR).filter((f) => f.endsWith(".jsonl"));
  const results = [];

  for (const file of files) {
    const events = readJsonl(join(EPISODIC_DIR, file));
    for (const evt of events) {
      const text = `${evt.description || ""} ${(evt.tags || []).join(" ")} ${evt.agent || ""} ${evt.type || ""}`.toLowerCase();
      const relevance = keywordScore(text, query);
      if (relevance > 0) {
        results.push({ ...evt, score: relevance });
      }
    }
  }

  // Also search working memory
  const diaryFiles = safeReaddirSync(WORKING_DIR).filter((f) => f.endsWith(".json"));
  const diaryResults = [];
  for (const file of diaryFiles) {
    const entry = readJson(join(WORKING_DIR, file), null);
    if (!entry) continue;
    const text = [
      entry.summary || "",
      ...(entry.decisions || []),
      ...(entry.discoveries || []),
      ...(entry.workarounds || []),
      entry.agent || "",
    ]
      .join(" ")
      .toLowerCase();
    const relevance = keywordScore(text, query);
    if (relevance > 0) {
      diaryResults.push({ ...entry, score: relevance, _type: "diary" });
    }
  }

  results.sort((a, b) => b.score - a.score);
  diaryResults.sort((a, b) => b.score - a.score);

  if (JSON_OUTPUT) {
    output({
      query,
      events: results.slice(0, 20),
      diaries: diaryResults.slice(0, 10),
    });
  } else {
    print(`${c.bold}Recall:${c.reset} ${query}\n`);

    if (diaryResults.length > 0) {
      print(`${c.blue}── Working Memory ──${c.reset}`);
      for (const d of diaryResults.slice(0, 5)) {
        print(`  ${formatScore(d.score)} ${c.dim}${d.date}${c.reset} [${d.agent}] ${d.summary}`);
      }
      print("");
    }

    if (results.length > 0) {
      print(`${c.cyan}── Episodic Events ──${c.reset}`);
      for (const evt of results.slice(0, 15)) {
        print(`  ${formatScore(evt.score)} ${c.dim}${relativeTime(evt.timestamp)}${c.reset} [${evt.type}] ${evt.description}`);
      }
    }

    if (results.length === 0 && diaryResults.length === 0) {
      print(`${c.yellow}○${c.reset} No results for: ${c.dim}${query}${c.reset}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

function printDiaryCompact(entry) {
  const agentColor = c.cyan;
  print(`  ${c.dim}${entry.id}${c.reset} ${c.bold}${entry.date}${c.reset} ${agentColor}${entry.agent}${c.reset} ${c.dim}(${entry.duration})${c.reset}`);
  print(`    ${entry.summary}`);
  if (entry.beadsCompleted && entry.beadsCompleted.length > 0) {
    print(`    ${c.green}✓ beads:${c.reset} ${entry.beadsCompleted.join(", ")}`);
  }
  if (entry.errors && entry.errors.length > 0) {
    print(`    ${c.red}✗ errors:${c.reset} ${entry.errors.slice(0, 2).join("; ")}`);
  }
  print("");
}

function printDiaryFull(entry) {
  print(`${c.bold}Diary Entry: ${entry.id}${c.reset}`);
  print(`${"─".repeat(60)}`);
  print(`  ${c.dim}Session:${c.reset}  ${entry.sessionId}`);
  print(`  ${c.dim}Date:${c.reset}     ${entry.date}`);
  print(`  ${c.dim}Agent:${c.reset}    ${entry.agent}`);
  print(`  ${c.dim}Duration:${c.reset} ${entry.duration}`);
  print(`  ${c.dim}Events:${c.reset}   ${entry.eventCount}`);
  print("");
  print(`  ${c.bold}Summary${c.reset}`);
  print(`  ${entry.summary}`);

  if (entry.decisions && entry.decisions.length > 0) {
    print("");
    print(`  ${c.bold}Decisions${c.reset}`);
    for (const d of entry.decisions) {
      print(`    • ${d}`);
    }
  }

  if (entry.discoveries && entry.discoveries.length > 0) {
    print("");
    print(`  ${c.bold}Discoveries${c.reset}`);
    for (const d of entry.discoveries) {
      print(`    • ${d}`);
    }
  }

  if (entry.workarounds && entry.workarounds.length > 0) {
    print("");
    print(`  ${c.bold}Workarounds${c.reset}`);
    for (const w of entry.workarounds) {
      print(`    • ${w}`);
    }
  }

  if (entry.errors && entry.errors.length > 0) {
    print("");
    print(`  ${c.red}${c.bold}Errors${c.reset}`);
    for (const e of entry.errors) {
      print(`    ${c.red}• ${e}${c.reset}`);
    }
  }

  if (entry.beadsCompleted && entry.beadsCompleted.length > 0) {
    print("");
    print(`  ${c.green}${c.bold}Beads Completed${c.reset}`);
    print(`    ${entry.beadsCompleted.join(", ")}`);
  }

  if (entry.filesModified && entry.filesModified.length > 0) {
    print("");
    print(`  ${c.bold}Files Modified${c.reset}`);
    for (const f of entry.filesModified) {
      print(`    ${c.dim}${f}${c.reset}`);
    }
  }

  if (entry.tokenEstimate) {
    print("");
    print(`  ${c.dim}Token estimate: ~${entry.tokenEstimate.input} in / ~${entry.tokenEstimate.output} out${c.reset}`);
  }
}

function printRuleCompact(rule) {
  const effective = rule.effectiveConfidence ?? decayConfidence(rule.confidence, rule.lastReinforcedAt);
  const stage = rule.stage ?? computeStage(effective);
  const stageColor = stage === "proven" ? c.green : stage === "established" ? c.blue : c.yellow;
  const confStr = formatConfidence(effective);

  print(`  ${c.dim}${rule.id}${c.reset} ${confStr} ${stageColor}[${stage}]${c.reset}`);
  print(`    ${c.bold}${rule.rule}${c.reset}`);
  if (rule.tags && rule.tags.length > 0) {
    print(`    ${c.dim}tags: ${rule.tags.join(", ")} | category: ${rule.category}${c.reset}`);
  }
  print("");
}

function formatConfidence(value) {
  const pct = Math.round(value * 100);
  const bar = "█".repeat(Math.round(value * 10)) + "░".repeat(10 - Math.round(value * 10));
  if (value >= 0.8) return `${c.green}${bar} ${pct}%${c.reset}`;
  if (value >= 0.6) return `${c.blue}${bar} ${pct}%${c.reset}`;
  if (value >= 0.3) return `${c.yellow}${bar} ${pct}%${c.reset}`;
  return `${c.red}${bar} ${pct}%${c.reset}`;
}

function formatScore(score) {
  const rounded = Math.round(score * 100);
  return `${c.dim}[${rounded}%]${c.reset}`;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function extractFlag(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  const value = args[idx + 1];
  // Remove the flag and its value from args (mutates)
  args.splice(idx, 2);
  return value || null;
}

function countFrequency(items) {
  const freq = {};
  for (const item of items) {
    const key = item.trim();
    if (!key) continue;
    freq[key] = (freq[key] || 0) + 1;
  }
  return freq;
}

function extractTags(text) {
  const tags = [];
  const keywords = [
    "build", "test", "deploy", "docker", "api", "frontend", "backend",
    "database", "auth", "security", "performance", "mcp", "grpc", "trpc",
    "graph", "neo4j", "pinecone", "vector", "search", "orchestration",
    "agent", "prompt", "context", "cache", "config", "kubernetes", "helm",
    "terraform", "ci", "cd", "pipeline", "workflow", "error", "debug",
    "typescript", "rust", "python", "node", "react", "next",
  ];
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw)) tags.push(kw);
  }
  return tags;
}

// ---------------------------------------------------------------------------
// Status command — quick overview
// ---------------------------------------------------------------------------

function cmdStatus(_args) {
  ensureDirs();

  const episodicFiles = safeReaddirSync(EPISODIC_DIR).filter((f) => f.endsWith(".jsonl"));
  const workingFiles = safeReaddirSync(WORKING_DIR).filter((f) => f.endsWith(".json"));
  const rules = readJson(RULES_PATH, []);

  let totalEvents = 0;
  for (const file of episodicFiles) {
    const events = readJsonl(join(EPISODIC_DIR, file));
    totalEvents += events.length;
  }

  const provenRules = rules.filter((r) => {
    const eff = decayConfidence(r.confidence, r.lastReinforcedAt);
    return computeStage(eff) === "proven";
  }).length;

  const establishedRules = rules.filter((r) => {
    const eff = decayConfidence(r.confidence, r.lastReinforcedAt);
    return computeStage(eff) === "established";
  }).length;

  const data = {
    episodic: { files: episodicFiles.length, events: totalEvents },
    working: { entries: workingFiles.length },
    procedural: {
      total: rules.length,
      proven: provenRules,
      established: establishedRules,
      candidate: rules.length - provenRules - establishedRules,
    },
    store: STORE,
  };

  if (JSON_OUTPUT) {
    output(data);
  } else {
    print(`${c.bold}Session Memory Status${c.reset}`);
    print(`${"─".repeat(40)}`);
    print(`  ${c.cyan}Episodic:${c.reset}   ${totalEvents} events across ${episodicFiles.length} files`);
    print(`  ${c.blue}Working:${c.reset}    ${workingFiles.length} diary entries`);
    print(`  ${c.magenta}Procedural:${c.reset} ${rules.length} rules (${provenRules} proven, ${establishedRules} established)`);
    print(`  ${c.dim}Store: ${STORE}${c.reset}`);
  }
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function print(msg) {
  process.stdout.write(msg + "\n");
}

function output(data) {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function die(msg) {
  if (JSON_OUTPUT) {
    process.stderr.write(JSON.stringify({ error: msg }) + "\n");
  } else {
    process.stderr.write(`${c.red}Error:${c.reset} ${msg}\n`);
  }
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  print(`
${c.bold}CASS-lite Session Memory${c.reset}
Three-layer memory architecture: Episodic → Working → Procedural

${c.bold}USAGE${c.reset}
  session-memory <command> [options] [--json]

${c.bold}LAYER 1 — EPISODIC (raw events)${c.reset}
  ${c.cyan}log${c.reset} <agent> <event-type> <description>    Log a session event
      Event types: ${VALID_EVENT_TYPES.join(", ")}
      Flags: --bead <id>, --files <a,b>, --tags <x,y>
  ${c.cyan}log-file${c.reset} <path>                           Import events from JSONL file

${c.bold}LAYER 2 — WORKING (structured summaries)${c.reset}
  ${c.cyan}summarize${c.reset} [--session <id>] [--today]      Generate diary from episodic logs
  ${c.cyan}diary${c.reset}                                     List recent diary entries
  ${c.cyan}diary show${c.reset} <entry-id>                     Show full diary entry

${c.bold}LAYER 3 — PROCEDURAL (distilled rules)${c.reset}
  ${c.cyan}reflect${c.reset}                                   Distill patterns into rules
  ${c.cyan}rules${c.reset} [--min-confidence <0-1>]            List procedural rules
  ${c.cyan}mark${c.reset} <rule-id> --helpful|--harmful        Reinforce or penalize a rule
      Flags: --reason <text>

${c.bold}SEARCH & CONTEXT${c.reset}
  ${c.cyan}context${c.reset} <description>                     Get relevant memories for a task
  ${c.cyan}recall${c.reset} <query>                            Search past sessions by keyword

${c.bold}META${c.reset}
  ${c.cyan}status${c.reset}                                    Show memory system overview
  ${c.cyan}rebuild-index${c.reset}                             Rebuild the search index

${c.bold}FLAGS${c.reset}
  --json    Machine-readable JSON output

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Log a decision${c.reset}
  session-memory log ScarletCave decision "Used topological sort for plan execution"

  ${c.dim}# Log with metadata${c.reset}
  session-memory log ScarletCave task-complete "Finished orchestration" --bead ORCH-001 --tags architecture,orchestration

  ${c.dim}# Summarize today's work${c.reset}
  session-memory summarize --today

  ${c.dim}# Get context for a new task${c.reset}
  session-memory context "circuit breaker configuration"

  ${c.dim}# Reinforce a useful rule${c.reset}
  session-memory mark rule-abc123 --helpful --reason "Saved 30 min of debugging"
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const rawArgs = process.argv.slice(2);

  // Extract --json flag
  const jsonIdx = rawArgs.indexOf("--json");
  if (jsonIdx !== -1) {
    JSON_OUTPUT = true;
    rawArgs.splice(jsonIdx, 1);
  }

  const command = rawArgs[0];
  const args = rawArgs.slice(1);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  // Ensure storage directories exist on every invocation
  ensureDirs();

  switch (command) {
    case "log":
      return cmdLog(args);
    case "log-file":
      return cmdLogFile(args);
    case "summarize":
      return cmdSummarize(args);
    case "diary":
      return cmdDiary(args);
    case "reflect":
      return cmdReflect(args);
    case "rules":
      return cmdRules(args);
    case "mark":
      return cmdMark(args);
    case "context":
      return cmdContext(args);
    case "recall":
      return cmdRecall(args);
    case "status":
      return cmdStatus(args);
    case "rebuild-index":
      rebuildIndex();
      if (JSON_OUTPUT) {
        output({ rebuilt: true });
      } else {
        print(`${c.green}✓${c.reset} Search index rebuilt`);
      }
      return;
    default:
      die(`Unknown command: ${command}\nRun 'session-memory help' for usage.`);
  }
}

main();
