#!/usr/bin/env node

/**
 * Agent Mail — Flywheel coordination layer for multi-agent swarms.
 *
 * Zero external dependencies. All state persists in .beads/agent-mail/.
 * Designed for concurrent access on Windows and Unix.
 *
 * Usage: node tools/agent-mail.mjs <command> [args] [--json]
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, renameSync, unlinkSync, existsSync } from "node:fs";
import { join, resolve, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import { argv, cwd, env, stdout } from "node:process";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = resolve(cwd());
const MAIL_DIR = join(ROOT, ".beads", "agent-mail");
const AGENTS_FILE = join(MAIL_DIR, "agents.json");
const RESERVATIONS_FILE = join(MAIL_DIR, "reservations.json");
const MESSAGES_DIR = join(MAIL_DIR, "messages");
const THREADS_DIR = join(MAIL_DIR, "threads");
const STATUS_FILE = join(ROOT, ".beads", ".status.json");

const DEFAULT_TTL_SECONDS = 3600;

// ---------------------------------------------------------------------------
// ANSI helpers
// ---------------------------------------------------------------------------

const supportsColor = !env.NO_COLOR && (env.FORCE_COLOR || stdout.isTTY);

const c = supportsColor
  ? {
      reset: "\x1b[0m",
      bold: "\x1b[1m",
      dim: "\x1b[2m",
      red: "\x1b[31m",
      green: "\x1b[32m",
      yellow: "\x1b[33m",
      blue: "\x1b[34m",
      magenta: "\x1b[35m",
      cyan: "\x1b[36m",
      white: "\x1b[37m",
      gray: "\x1b[90m",
    }
  : {
      reset: "", bold: "", dim: "", red: "", green: "", yellow: "",
      blue: "", magenta: "", cyan: "", white: "", gray: "",
    };

function fmt(color, text) {
  return `${color}${text}${c.reset}`;
}

// ---------------------------------------------------------------------------
// Whimsical name generator
// ---------------------------------------------------------------------------

const ADJECTIVES = [
  "Scarlet", "Amber", "Azure", "Coral", "Crimson", "Emerald", "Golden",
  "Indigo", "Ivory", "Jade", "Lunar", "Misty", "Neon", "Opal", "Pearl",
  "Quartz", "Rustic", "Silver", "Tawny", "Velvet", "Cobalt", "Dusk",
  "Frost", "Haze", "Iron", "Mossy", "Noble", "Onyx", "Prism", "Sage",
  "Tidal", "Vivid", "Wren", "Zephyr", "Brisk", "Cedar", "Dusky", "Ember",
  "Flint", "Gale", "Hazel", "Keen", "Lark", "Mirth", "North", "Plume",
  "Rowan", "Storm", "Terra", "Ashen",
];

const NOUNS = [
  "Cave", "Lake", "Badger", "Falcon", "Ridge", "Brook", "Crane", "Dune",
  "Elm", "Fox", "Grove", "Hawk", "Isle", "Jay", "Knoll", "Lynx", "Marsh",
  "Nest", "Oak", "Pike", "Quail", "Reef", "Stone", "Thorn", "Vale",
  "Wolf", "Birch", "Cliff", "Dell", "Finch", "Glen", "Heron", "Ivy",
  "Junco", "Kite", "Loon", "Mink", "Newt", "Otter", "Pines", "Raven",
  "Shale", "Trout", "Umber", "Vole", "Wren", "Yarrow", "Aspen", "Bluff",
  "Cove",
];

function generateWhimsicalName() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}${noun}`;
}

// ---------------------------------------------------------------------------
// File I/O with atomic write (read-modify-write safety)
// ---------------------------------------------------------------------------

function ensureDirs() {
  mkdirSync(MAIL_DIR, { recursive: true });
  mkdirSync(MESSAGES_DIR, { recursive: true });
  mkdirSync(THREADS_DIR, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJsonAtomic(filePath, data) {
  const tmp = `${filePath}.${randomUUID()}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n", "utf-8");
  try {
    renameSync(tmp, filePath);
  } catch {
    // On Windows, rename can fail if target exists — fallback to overwrite
    writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
    try { unlinkSync(tmp); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// Agent identity resolution
// ---------------------------------------------------------------------------

function currentAgentName() {
  // Check AGENT_MAIL_ID env var first, then AGENT_NAME
  return env.AGENT_MAIL_ID || env.AGENT_NAME || null;
}

function requireAgent() {
  const name = currentAgentName();
  if (!name) {
    die("No agent identity set. Export AGENT_MAIL_ID or AGENT_NAME, or run 'register <name>' first.");
  }
  const agents = readJson(AGENTS_FILE, { agents: [] });
  const agent = agents.agents.find((a) => a.name === name || a.id === name);
  if (!agent) {
    die(`Agent "${name}" is not registered. Run 'register' first.`);
  }
  return agent;
}

// ---------------------------------------------------------------------------
// Reservation TTL cleanup
// ---------------------------------------------------------------------------

function cleanExpiredReservations() {
  const data = readJson(RESERVATIONS_FILE, { reservations: [] });
  const now = new Date().toISOString();
  const before = data.reservations.length;
  data.reservations = data.reservations.filter((r) => r.expiresAt > now);
  if (data.reservations.length !== before) {
    writeJsonAtomic(RESERVATIONS_FILE, data);
  }
  return data;
}

// ---------------------------------------------------------------------------
// UUID helpers
// ---------------------------------------------------------------------------

function msgId() {
  return `msg-${randomUUID().slice(0, 12)}`;
}

function thrId(beadId) {
  if (beadId) return `thr-${beadId}`;
  return `thr-${randomUUID().slice(0, 12)}`;
}

function resId() {
  return `res-${randomUUID().slice(0, 12)}`;
}

// ---------------------------------------------------------------------------
// Thread management
// ---------------------------------------------------------------------------

function getOrCreateThread(threadId) {
  const threadFile = join(THREADS_DIR, `${threadId}.json`);
  return readJson(threadFile, { id: threadId, messageIds: [], createdAt: new Date().toISOString() });
}

function appendToThread(threadId, messageId) {
  const thread = getOrCreateThread(threadId);
  if (!thread.messageIds.includes(messageId)) {
    thread.messageIds.push(messageId);
  }
  const threadFile = join(THREADS_DIR, `${threadId}.json`);
  writeJsonAtomic(threadFile, thread);
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

let JSON_MODE = false;

function output(structured, formatted) {
  if (JSON_MODE) {
    console.log(JSON.stringify(structured, null, 2));
  } else {
    console.log(formatted);
  }
}

function die(message) {
  if (JSON_MODE) {
    console.error(JSON.stringify({ error: message }));
  } else {
    console.error(`${fmt(c.red, "ERROR")} ${message}`);
  }
  process.exit(1);
}

function success(message) {
  if (JSON_MODE) return; // JSON mode uses structured output
  console.log(`${fmt(c.green, "OK")} ${message}`);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function formatTimestamp(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return ts;
  }
}

function formatMessage(msg) {
  const readStatus = msg.read ? fmt(c.dim, "[read]") : fmt(c.yellow, "[unread]");
  const fromTo = msg.to === "*"
    ? `${fmt(c.cyan, msg.from)} -> ${fmt(c.magenta, "ALL")}`
    : `${fmt(c.cyan, msg.from)} -> ${fmt(c.cyan, msg.to)}`;
  return [
    `${fmt(c.bold, msg.id)} ${readStatus}  ${fmt(c.gray, formatTimestamp(msg.timestamp))}`,
    `  ${fromTo}`,
    `  ${fmt(c.bold, "Subject:")} ${msg.subject}`,
    `  ${fmt(c.bold, "Thread:")} ${msg.threadId}`,
    msg.replyTo ? `  ${fmt(c.dim, `Reply to: ${msg.replyTo}`)}` : null,
    `  ${msg.body}`,
  ].filter(Boolean).join("\n");
}

function formatAgent(agent) {
  const status = agent.status === "active" ? fmt(c.green, "active") : fmt(c.dim, agent.status);
  return `  ${fmt(c.cyan, agent.name)} ${fmt(c.dim, `(${agent.id})`)}  ${status}  registered ${fmt(c.gray, formatTimestamp(agent.registeredAt))}`;
}

function formatReservation(res) {
  const expired = new Date(res.expiresAt) < new Date();
  const status = expired ? fmt(c.red, "EXPIRED") : fmt(c.green, "active");
  return [
    `  ${fmt(c.bold, res.id)} ${status}  by ${fmt(c.cyan, res.agent)}`,
    `    Patterns: ${res.patterns.join(", ")}`,
    `    Reason: ${res.reason || "(none)"}`,
    `    Expires: ${fmt(c.gray, formatTimestamp(res.expiresAt))}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// COMMANDS
// ---------------------------------------------------------------------------

const commands = {};

// -- register ---------------------------------------------------------------

commands.register = function register(args) {
  const inputName = args[0];
  const agents = readJson(AGENTS_FILE, { agents: [] });

  // If a name was given, check for conflicts
  if (inputName && agents.agents.some((a) => a.name === inputName)) {
    die(`Agent "${inputName}" is already registered.`);
  }

  const name = inputName || generateWhimsicalName();

  // Avoid name collisions on generated names
  let finalName = name;
  while (agents.agents.some((a) => a.name === finalName)) {
    finalName = generateWhimsicalName();
  }

  const agent = {
    id: `agt-${randomUUID().slice(0, 8)}`,
    name: finalName,
    status: "active",
    registeredAt: new Date().toISOString(),
  };

  agents.agents.push(agent);
  writeJsonAtomic(AGENTS_FILE, agents);

  output(agent, [
    fmt(c.green, "Agent registered!"),
    `  Name: ${fmt(c.bold + c.cyan, agent.name)}`,
    `  ID:   ${fmt(c.dim, agent.id)}`,
    "",
    fmt(c.yellow, `Set your identity: export AGENT_MAIL_ID="${agent.name}"`),
  ].join("\n"));
};

// -- whoami -----------------------------------------------------------------

commands.whoami = function whoami() {
  const agent = requireAgent();
  output(agent, [
    fmt(c.bold, "Current Agent"),
    `  Name:   ${fmt(c.cyan, agent.name)}`,
    `  ID:     ${fmt(c.dim, agent.id)}`,
    `  Status: ${agent.status === "active" ? fmt(c.green, "active") : agent.status}`,
    `  Since:  ${fmt(c.gray, formatTimestamp(agent.registeredAt))}`,
  ].join("\n"));
};

// -- agents -----------------------------------------------------------------

commands.agents = function listAgents() {
  const data = readJson(AGENTS_FILE, { agents: [] });
  if (data.agents.length === 0) {
    output({ agents: [] }, fmt(c.dim, "No agents registered."));
    return;
  }
  const lines = data.agents.map(formatAgent);
  output(data, `${fmt(c.bold, "Registered Agents")} (${data.agents.length})\n${lines.join("\n")}`);
};

// -- send -------------------------------------------------------------------

commands.send = function send(args) {
  if (args.length < 3) die("Usage: send <to-agent> <subject> <body>");

  const agent = requireAgent();
  const [toName, subject, ...bodyParts] = args;
  const body = bodyParts.join(" ");

  // Validate recipient exists
  const agents = readJson(AGENTS_FILE, { agents: [] });
  const recipient = agents.agents.find((a) => a.name === toName || a.id === toName);
  if (!recipient) die(`Recipient "${toName}" not found. Run 'agents' to see registered agents.`);

  const threadId = thrId(null);
  const msg = {
    id: msgId(),
    threadId,
    from: agent.name,
    to: recipient.name,
    subject,
    body,
    timestamp: new Date().toISOString(),
    read: false,
    replyTo: null,
  };

  writeJsonAtomic(join(MESSAGES_DIR, `${msg.id}.json`), msg);
  appendToThread(threadId, msg.id);

  output(msg, [
    fmt(c.green, "Message sent!"),
    `  To:      ${fmt(c.cyan, recipient.name)}`,
    `  Subject: ${subject}`,
    `  ID:      ${fmt(c.dim, msg.id)}`,
    `  Thread:  ${fmt(c.dim, threadId)}`,
  ].join("\n"));
};

// -- broadcast --------------------------------------------------------------

commands.broadcast = function broadcast(args) {
  if (args.length < 2) die("Usage: broadcast <subject> <body>");

  const agent = requireAgent();
  const [subject, ...bodyParts] = args;
  const body = bodyParts.join(" ");

  const threadId = thrId(null);
  const msg = {
    id: msgId(),
    threadId,
    from: agent.name,
    to: "*",
    subject,
    body,
    timestamp: new Date().toISOString(),
    read: false,
    replyTo: null,
  };

  writeJsonAtomic(join(MESSAGES_DIR, `${msg.id}.json`), msg);
  appendToThread(threadId, msg.id);

  output(msg, [
    fmt(c.yellow, "Broadcast sent!"),
    `  Subject: ${subject}`,
    `  ID:      ${fmt(c.dim, msg.id)}`,
    `  Thread:  ${fmt(c.dim, threadId)}`,
  ].join("\n"));
};

// -- inbox ------------------------------------------------------------------

commands.inbox = function inbox(args) {
  const agent = requireAgent();
  const unreadOnly = args.includes("--unread");

  const allMessages = loadAllMessages();
  let messages = allMessages.filter(
    (m) => m.to === agent.name || m.to === "*"
  );

  // Exclude messages sent by self for broadcasts
  messages = messages.filter((m) => !(m.to === "*" && m.from === agent.name));

  if (unreadOnly) {
    messages = messages.filter((m) => !m.read);
  }

  // Sort newest first
  messages.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  if (messages.length === 0) {
    output({ messages: [] }, fmt(c.dim, unreadOnly ? "No unread messages." : "Inbox is empty."));
    return;
  }

  const lines = messages.map(formatMessage);
  const label = unreadOnly ? "Unread Messages" : "Inbox";
  output(
    { messages },
    `${fmt(c.bold, label)} (${messages.length})\n\n${lines.join("\n\n")}`
  );
};

// -- read -------------------------------------------------------------------

commands.read = function readMsg(args) {
  if (args.length < 1) die("Usage: read <message-id>");

  const msgFile = join(MESSAGES_DIR, `${args[0]}.json`);
  const msg = readJson(msgFile, null);
  if (!msg) die(`Message "${args[0]}" not found.`);

  // Mark as read
  msg.read = true;
  writeJsonAtomic(msgFile, msg);

  output(msg, formatMessage(msg));
};

// -- reply ------------------------------------------------------------------

commands.reply = function reply(args) {
  if (args.length < 2) die("Usage: reply <message-id> <body>");

  const agent = requireAgent();
  const [originalId, ...bodyParts] = args;
  const body = bodyParts.join(" ");

  const originalFile = join(MESSAGES_DIR, `${originalId}.json`);
  const original = readJson(originalFile, null);
  if (!original) die(`Message "${originalId}" not found.`);

  const msg = {
    id: msgId(),
    threadId: original.threadId,
    from: agent.name,
    to: original.from,
    subject: `Re: ${original.subject}`,
    body,
    timestamp: new Date().toISOString(),
    read: false,
    replyTo: original.id,
  };

  writeJsonAtomic(join(MESSAGES_DIR, `${msg.id}.json`), msg);
  appendToThread(original.threadId, msg.id);

  output(msg, [
    fmt(c.green, "Reply sent!"),
    `  To:      ${fmt(c.cyan, msg.to)}`,
    `  Subject: ${msg.subject}`,
    `  Thread:  ${fmt(c.dim, msg.threadId)}`,
  ].join("\n"));
};

// -- thread -----------------------------------------------------------------

commands.thread = function showThread(args) {
  if (args.length < 1) die("Usage: thread <thread-id>");

  const threadId = args[0];
  const threadFile = join(THREADS_DIR, `${threadId}.json`);
  const thread = readJson(threadFile, null);
  if (!thread) die(`Thread "${threadId}" not found.`);

  const messages = thread.messageIds
    .map((id) => readJson(join(MESSAGES_DIR, `${id}.json`), null))
    .filter(Boolean)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (messages.length === 0) {
    output({ thread, messages: [] }, fmt(c.dim, "Thread is empty."));
    return;
  }

  const lines = messages.map(formatMessage);
  output(
    { thread, messages },
    `${fmt(c.bold, `Thread ${threadId}`)} (${messages.length} messages)\n\n${lines.join("\n\n")}`
  );
};

// -- reserve ----------------------------------------------------------------

commands.reserve = function reserve(args) {
  if (args.length < 1) die("Usage: reserve <glob-pattern> [--ttl <seconds>] [--reason <text>]");

  const agent = requireAgent();
  cleanExpiredReservations();

  const patterns = [];
  let ttlSeconds = DEFAULT_TTL_SECONDS;
  let reason = "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ttl" && args[i + 1]) {
      ttlSeconds = parseInt(args[i + 1], 10);
      if (isNaN(ttlSeconds) || ttlSeconds <= 0) die("TTL must be a positive integer.");
      i++;
    } else if (args[i] === "--reason" && args[i + 1]) {
      reason = args.slice(i + 1).join(" ");
      break;
    } else {
      patterns.push(args[i]);
    }
  }

  if (patterns.length === 0) die("At least one glob pattern is required.");

  // Check for overlapping reservations from other agents
  const data = readJson(RESERVATIONS_FILE, { reservations: [] });
  const conflicts = data.reservations.filter(
    (r) => r.agent !== agent.name && r.exclusive && patternsOverlap(patterns, r.patterns)
  );

  if (conflicts.length > 0) {
    const conflictInfo = conflicts.map(
      (r) => `  ${fmt(c.red, r.agent)} holds ${r.patterns.join(", ")} (${r.id})`
    ).join("\n");

    if (!JSON_MODE) {
      console.log(fmt(c.yellow, "WARNING: Overlapping reservations detected (advisory):"));
      console.log(conflictInfo);
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

  const reservation = {
    id: resId(),
    agent: agent.name,
    patterns,
    exclusive: true,
    reason,
    createdAt: now.toISOString(),
    ttlSeconds,
    expiresAt: expiresAt.toISOString(),
  };

  data.reservations.push(reservation);
  writeJsonAtomic(RESERVATIONS_FILE, data);

  output(reservation, [
    fmt(c.green, "Reservation created!"),
    `  ID:       ${fmt(c.dim, reservation.id)}`,
    `  Patterns: ${patterns.join(", ")}`,
    `  Expires:  ${fmt(c.gray, formatTimestamp(expiresAt.toISOString()))}`,
    reason ? `  Reason:   ${reason}` : null,
    conflicts.length > 0 ? fmt(c.yellow, `  (${conflicts.length} overlapping reservation(s) — advisory only)`) : null,
  ].filter(Boolean).join("\n"));
};

// -- release ----------------------------------------------------------------

commands.release = function release(args) {
  if (args.length < 1) die("Usage: release <reservation-id>");

  const agent = requireAgent();
  const data = readJson(RESERVATIONS_FILE, { reservations: [] });
  const idx = data.reservations.findIndex((r) => r.id === args[0]);

  if (idx === -1) die(`Reservation "${args[0]}" not found.`);

  const reservation = data.reservations[idx];
  if (reservation.agent !== agent.name) {
    die(`Reservation "${args[0]}" belongs to ${reservation.agent}, not ${agent.name}.`);
  }

  data.reservations.splice(idx, 1);
  writeJsonAtomic(RESERVATIONS_FILE, data);

  output({ released: reservation }, [
    fmt(c.green, "Reservation released!"),
    `  ID:       ${fmt(c.dim, reservation.id)}`,
    `  Patterns: ${reservation.patterns.join(", ")}`,
  ].join("\n"));
};

// -- reservations -----------------------------------------------------------

commands.reservations = function listReservations() {
  const data = cleanExpiredReservations();

  if (data.reservations.length === 0) {
    output({ reservations: [] }, fmt(c.dim, "No active reservations."));
    return;
  }

  const lines = data.reservations.map(formatReservation);
  output(data, `${fmt(c.bold, "Active Reservations")} (${data.reservations.length})\n\n${lines.join("\n\n")}`);
};

// -- check ------------------------------------------------------------------

commands.check = function check(args) {
  if (args.length < 1) die("Usage: check <file-path>");

  const agent = currentAgentName();
  cleanExpiredReservations();

  const filePath = normalize(args[0]);
  const data = readJson(RESERVATIONS_FILE, { reservations: [] });

  const matches = data.reservations.filter((r) => {
    if (agent && r.agent === agent) return false; // own reservations don't count
    return r.patterns.some((pattern) => globMatch(pattern, filePath));
  });

  if (matches.length === 0) {
    output(
      { file: filePath, reserved: false, reservations: [] },
      `${fmt(c.green, "CLEAR")} ${filePath} — no conflicting reservations.`
    );
  } else {
    const lines = matches.map(formatReservation);
    output(
      { file: filePath, reserved: true, reservations: matches },
      `${fmt(c.yellow, "RESERVED")} ${filePath}\n\n${lines.join("\n\n")}`
    );
  }
};

// -- claim-bead -------------------------------------------------------------

commands["claim-bead"] = function claimBead(args) {
  if (args.length < 1) die("Usage: claim-bead <bead-id> [--message <text>]");

  const agent = requireAgent();
  const beadId = args[0];

  let message = "";
  const msgIdx = args.indexOf("--message");
  if (msgIdx !== -1) {
    message = args.slice(msgIdx + 1).join(" ");
  }

  // Read and update .beads/.status.json
  const status = readJson(STATUS_FILE, null);
  if (!status) die("Cannot read .beads/.status.json");

  const bead = status.beads?.[beadId];
  if (!bead) die(`Bead "${beadId}" not found in .status.json`);

  if (bead.status !== "open" && bead.status !== "blocked") {
    if (bead.assignedAgent && bead.assignedAgent !== agent.name) {
      die(`Bead "${beadId}" is ${bead.status} and assigned to ${bead.assignedAgent}.`);
    }
  }

  // Update bead status
  bead.status = "claimed";
  bead.assignedAgent = agent.name;
  status.lastUpdated = new Date().toISOString();
  writeJsonAtomic(STATUS_FILE, status);

  // Create a thread message for the bead
  const threadId = thrId(beadId);
  const msg = {
    id: msgId(),
    threadId,
    from: agent.name,
    to: "*",
    subject: `[${beadId}] Claimed: ${bead.title}`,
    body: message || `Claiming bead ${beadId}: ${bead.title}`,
    timestamp: new Date().toISOString(),
    read: false,
    replyTo: null,
  };

  writeJsonAtomic(join(MESSAGES_DIR, `${msg.id}.json`), msg);
  appendToThread(threadId, msg.id);

  output(
    { bead: { id: beadId, ...bead }, message: msg },
    [
      fmt(c.green, `Bead ${beadId} claimed!`),
      `  Title:  ${bead.title}`,
      `  Agent:  ${fmt(c.cyan, agent.name)}`,
      `  Thread: ${fmt(c.dim, threadId)}`,
      message ? `  Note:   ${message}` : null,
    ].filter(Boolean).join("\n")
  );
};

// -- update-bead ------------------------------------------------------------

commands["update-bead"] = function updateBead(args) {
  if (args.length < 2) die("Usage: update-bead <bead-id> <status> [--message <text>]");

  const agent = requireAgent();
  const beadId = args[0];
  const newStatus = args[1];

  const validStatuses = ["open", "claimed", "implementing", "verifying", "done", "blocked"];
  if (!validStatuses.includes(newStatus)) {
    die(`Invalid status "${newStatus}". Valid: ${validStatuses.join(", ")}`);
  }

  let message = "";
  const msgIdx = args.indexOf("--message");
  if (msgIdx !== -1) {
    message = args.slice(msgIdx + 1).join(" ");
  }

  const status = readJson(STATUS_FILE, null);
  if (!status) die("Cannot read .beads/.status.json");

  const bead = status.beads?.[beadId];
  if (!bead) die(`Bead "${beadId}" not found in .status.json`);

  const previousStatus = bead.status;
  bead.status = newStatus;
  if (newStatus === "open") {
    bead.assignedAgent = null;
  }
  status.lastUpdated = new Date().toISOString();
  writeJsonAtomic(STATUS_FILE, status);

  // Post to bead thread
  const threadId = thrId(beadId);
  const msg = {
    id: msgId(),
    threadId,
    from: agent.name,
    to: "*",
    subject: `[${beadId}] ${previousStatus} -> ${newStatus}`,
    body: message || `Updated bead ${beadId} from ${previousStatus} to ${newStatus}.`,
    timestamp: new Date().toISOString(),
    read: false,
    replyTo: null,
  };

  writeJsonAtomic(join(MESSAGES_DIR, `${msg.id}.json`), msg);
  appendToThread(threadId, msg.id);

  output(
    { bead: { id: beadId, ...bead }, message: msg },
    [
      fmt(c.green, `Bead ${beadId} updated!`),
      `  ${fmt(c.dim, previousStatus)} -> ${fmt(c.bold, newStatus)}`,
      `  Thread: ${fmt(c.dim, threadId)}`,
      message ? `  Note:   ${message}` : null,
    ].filter(Boolean).join("\n")
  );
};

// ---------------------------------------------------------------------------
// Glob matching (simple, handles *, **, ?)
// ---------------------------------------------------------------------------

function globToRegex(pattern) {
  // Normalize separators
  const normalized = pattern.replace(/\\/g, "/");
  let regex = "";
  let i = 0;
  while (i < normalized.length) {
    const ch = normalized[i];
    if (ch === "*") {
      if (normalized[i + 1] === "*") {
        if (normalized[i + 2] === "/") {
          regex += "(?:.+/)?";
          i += 3;
          continue;
        }
        regex += ".*";
        i += 2;
        continue;
      }
      regex += "[^/]*";
    } else if (ch === "?") {
      regex += "[^/]";
    } else if (".+^${}()|[]\\".includes(ch)) {
      regex += "\\" + ch;
    } else {
      regex += ch;
    }
    i++;
  }
  return new RegExp(`^${regex}$`);
}

function globMatch(pattern, filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const re = globToRegex(pattern);
  return re.test(normalizedPath);
}

function patternsOverlap(patternsA, patternsB) {
  // Simple heuristic: check if any pattern prefix overlaps
  // A more robust approach would require full path enumeration, but for advisory
  // reservations this is sufficient.
  for (const a of patternsA) {
    for (const b of patternsB) {
      const aNorm = a.replace(/\\/g, "/");
      const bNorm = b.replace(/\\/g, "/");
      // Check if they share a common directory prefix
      const aParts = aNorm.split("/").filter(Boolean);
      const bParts = bNorm.split("/").filter(Boolean);
      const minLen = Math.min(aParts.length, bParts.length);
      let overlap = false;
      for (let i = 0; i < minLen; i++) {
        if (aParts[i] === bParts[i]) {
          overlap = true;
        } else if (!aParts[i].includes("*") && !bParts[i].includes("*")) {
          overlap = false;
          break;
        } else {
          overlap = true;
          break;
        }
      }
      if (overlap) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Load all messages
// ---------------------------------------------------------------------------

function loadAllMessages() {
  try {
    const files = readdirSync(MESSAGES_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => readJson(join(MESSAGES_DIR, f), null))
      .filter(Boolean);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function showHelp() {
  const help = `
${fmt(c.bold + c.cyan, "Agent Mail")} — Flywheel coordination layer for multi-agent swarms

${fmt(c.bold, "USAGE")}
  node tools/agent-mail.mjs <command> [args] [--json]

${fmt(c.bold, "IDENTITY")}
  ${fmt(c.green, "register")} [name]                  Register an agent (auto-generates whimsical name)
  ${fmt(c.green, "whoami")}                            Show current agent identity
  ${fmt(c.green, "agents")}                            List all registered agents

${fmt(c.bold, "MESSAGING")}
  ${fmt(c.green, "send")} <to> <subject> <body>       Send a direct message
  ${fmt(c.green, "broadcast")} <subject> <body>        Broadcast to all agents
  ${fmt(c.green, "inbox")} [--unread]                  Show inbox messages
  ${fmt(c.green, "read")} <message-id>                 Read a specific message
  ${fmt(c.green, "reply")} <message-id> <body>         Reply to a message
  ${fmt(c.green, "thread")} <thread-id>                Show full conversation thread

${fmt(c.bold, "FILE RESERVATIONS")}
  ${fmt(c.green, "reserve")} <glob> [--ttl N] [--reason text]  Reserve files (advisory)
  ${fmt(c.green, "release")} <reservation-id>          Release a reservation
  ${fmt(c.green, "reservations")}                      List active reservations
  ${fmt(c.green, "check")} <file-path>                 Check if a file is reserved

${fmt(c.bold, "BEAD THREADING")}
  ${fmt(c.green, "claim-bead")} <bead-id> [--message text]     Claim a bead and announce
  ${fmt(c.green, "update-bead")} <bead-id> <status> [--message text]  Update bead status

${fmt(c.bold, "FLAGS")}
  --json                             Output structured JSON instead of formatted text
  --help, -h                         Show this help

${fmt(c.bold, "ENVIRONMENT")}
  AGENT_MAIL_ID                      Current agent identity (name or ID)
  AGENT_NAME                         Fallback agent identity

${fmt(c.dim, "State stored in .beads/agent-mail/")}
`;
  console.log(help.trim());
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const raw = argv.slice(2);
  const args = [];
  let jsonMode = false;
  let helpMode = false;

  for (const arg of raw) {
    if (arg === "--json") {
      jsonMode = true;
    } else if (arg === "--help" || arg === "-h") {
      helpMode = true;
    } else {
      args.push(arg);
    }
  }

  return { command: args[0], args: args.slice(1), jsonMode, helpMode };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const parsed = parseArgs();
  JSON_MODE = parsed.jsonMode;

  if (parsed.helpMode || !parsed.command) {
    showHelp();
    process.exit(0);
  }

  ensureDirs();

  // Run TTL cleanup on every invocation
  cleanExpiredReservations();

  const handler = commands[parsed.command];
  if (!handler) {
    die(`Unknown command: "${parsed.command}". Run with --help for usage.`);
  }

  handler(parsed.args);
}

main();
