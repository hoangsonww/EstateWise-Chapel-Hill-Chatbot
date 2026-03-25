#!/usr/bin/env node

/**
 * bv.mjs — Bead Value graph-theory triage tool (Flywheel methodology)
 *
 * Computes dependency graph metrics on the bead system to help agents
 * choose optimal next work. Zero external dependencies.
 *
 * Usage:
 *   node tools/bv.mjs --robot-triage
 *   node tools/bv.mjs --robot-next
 *   node tools/bv.mjs --robot-plan
 *   node tools/bv.mjs --robot-insights
 *   node tools/bv.mjs --robot-priority
 *   node tools/bv.mjs --robot-diff --diff-since <status>
 *   node tools/bv.mjs claim <bead-id>
 *   node tools/bv.mjs complete <bead-id>
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAMPING = 0.85;
const PAGERANK_ITERATIONS = 100;
const HITS_ITERATIONS = 100;
const EPSILON = 1e-10;

const STATUSES = /** @type {const} */ ([
  "open",
  "claimed",
  "implementing",
  "verifying",
  "done",
  "blocked",
]);

const DONE_STATUSES = new Set(["done"]);
const ACTIVE_STATUSES = new Set([
  "open",
  "claimed",
  "implementing",
  "verifying",
  "blocked",
]);

// ---------------------------------------------------------------------------
// Types (JSDoc only — no runtime cost)
// ---------------------------------------------------------------------------

/**
 * @typedef {"open"|"claimed"|"implementing"|"verifying"|"done"|"blocked"} BeadStatus
 * @typedef {"p0"|"p1"|"p2"} Priority
 *
 * @typedef {Object} Bead
 * @property {string}   title
 * @property {string}   domain
 * @property {BeadStatus} status
 * @property {string}   [assignedAgent]
 * @property {Priority} priority
 * @property {string[]} dependsOn
 * @property {string}   [artifact]
 * @property {string}   [verification]
 *
 * @typedef {Object} StatusFile
 * @property {string} lastUpdated
 * @property {Record<string, Bead>} beads
 *
 * @typedef {Object} GraphMetrics
 * @property {Map<string, number>} pageRank
 * @property {Map<string, number>} betweenness
 * @property {Map<string, number>} inDegree
 * @property {Map<string, number>} outDegree
 * @property {string[]}            criticalPath
 * @property {string[][]}          cycles
 * @property {string[]|null}       topoOrder
 * @property {Map<string, {hub: number, authority: number}>} hits
 * @property {string[][]}          executionLevels
 *
 * @typedef {Object} CliFlags
 * @property {boolean} robotTriage
 * @property {boolean} robotNext
 * @property {boolean} robotPlan
 * @property {boolean} robotInsights
 * @property {boolean} robotPriority
 * @property {boolean} robotDiff
 * @property {string|null} diffSince
 * @property {string|null} status
 * @property {string|null} domain
 * @property {boolean} json
 * @property {boolean} help
 * @property {string|null} subcommand
 * @property {string|null} subcommandArg
 */

// ---------------------------------------------------------------------------
// Repo root detection
// ---------------------------------------------------------------------------

/**
 * Find the git repository root by running `git rev-parse --show-toplevel`.
 * Uses execFileSync (no shell) to avoid command injection.
 * @returns {string} Absolute path to repo root.
 */
function findRepoRoot() {
  try {
    const root = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return root;
  } catch {
    fatal("Not inside a git repository. Run this from within the repo.");
  }
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

/**
 * Read and parse .beads/.status.json from the repository root.
 * @param {string} repoRoot
 * @returns {StatusFile}
 */
function readStatusFile(repoRoot) {
  const filePath = join(repoRoot, ".beads", ".status.json");
  try {
    const raw = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.beads !== "object") {
      fatal(
        `.beads/.status.json is malformed — missing "beads" object at top level.`
      );
    }
    return parsed;
  } catch (/** @type {unknown} */ err) {
    if (err instanceof SyntaxError) {
      fatal(`.beads/.status.json contains invalid JSON: ${err.message}`);
    }
    const code = /** @type {NodeJS.ErrnoException} */ (err).code;
    if (code === "ENOENT") {
      fatal(
        `.beads/.status.json not found at ${filePath}. Is this the right repo?`
      );
    }
    throw err;
  }
}

/**
 * Write the status file back to disk.
 * @param {string} repoRoot
 * @param {StatusFile} data
 */
function writeStatusFile(repoRoot, data) {
  const filePath = join(repoRoot, ".beads", ".status.json");
  data.lastUpdated = new Date().toISOString();
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

/**
 * Parse process.argv into structured flags.
 * @param {string[]} argv
 * @returns {CliFlags}
 */
function parseArgs(argv) {
  /** @type {CliFlags} */
  const flags = {
    robotTriage: false,
    robotNext: false,
    robotPlan: false,
    robotInsights: false,
    robotPriority: false,
    robotDiff: false,
    diffSince: null,
    status: null,
    domain: null,
    json: false,
    help: false,
    subcommand: null,
    subcommandArg: null,
  };

  const args = argv.slice(2);

  // Detect subcommands first (claim, complete)
  if (args.length >= 1 && (args[0] === "claim" || args[0] === "complete")) {
    flags.subcommand = args[0];
    if (args.length < 2) {
      fatal(`Usage: bv ${args[0]} <bead-id>`);
    }
    flags.subcommandArg = args[1];
    return flags;
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--robot-triage":
        flags.robotTriage = true;
        break;
      case "--robot-next":
        flags.robotNext = true;
        break;
      case "--robot-plan":
        flags.robotPlan = true;
        break;
      case "--robot-insights":
        flags.robotInsights = true;
        break;
      case "--robot-priority":
        flags.robotPriority = true;
        break;
      case "--robot-diff":
        flags.robotDiff = true;
        break;
      case "--diff-since":
        i++;
        if (i >= args.length) fatal("--diff-since requires a value");
        flags.diffSince = args[i];
        break;
      case "--status":
        i++;
        if (i >= args.length) fatal("--status requires a value");
        flags.status = args[i];
        break;
      case "--domain":
        i++;
        if (i >= args.length) fatal("--domain requires a value");
        flags.domain = args[i];
        break;
      case "--json":
        flags.json = true;
        break;
      case "--help":
      case "-h":
        flags.help = true;
        break;
      default:
        fatal(`Unknown argument: ${arg}\nRun with --help for usage.`);
    }
  }

  return flags;
}

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DirectedGraph
 * @property {string[]}                  nodes
 * @property {Map<string, Set<string>>}  adj      Forward adjacency (A depends on B => edge B->A)
 * @property {Map<string, Set<string>>}  radj     Reverse adjacency (A depends on B => edge A->B)
 */

/**
 * Build a directed graph from beads. An edge from B to A means "B must
 * complete before A can start" (i.e., A dependsOn B).
 *
 * @param {Record<string, Bead>} beads
 * @returns {DirectedGraph}
 */
function buildGraph(beads) {
  const nodes = Object.keys(beads);
  /** @type {Map<string, Set<string>>} */
  const adj = new Map();
  /** @type {Map<string, Set<string>>} */
  const radj = new Map();

  for (const id of nodes) {
    adj.set(id, new Set());
    radj.set(id, new Set());
  }

  for (const id of nodes) {
    const bead = beads[id];
    for (const dep of bead.dependsOn) {
      if (!adj.has(dep)) {
        // Dependency references a bead not in the file — skip silently.
        continue;
      }
      // dep -> id (dep must finish before id)
      adj.get(dep).add(id);
      radj.get(id).add(dep);
    }
  }

  return { nodes, adj, radj };
}

// ---------------------------------------------------------------------------
// PageRank (iterative power method)
// ---------------------------------------------------------------------------

/**
 * Compute PageRank scores for all nodes.
 * @param {DirectedGraph} graph
 * @returns {Map<string, number>}
 */
function computePageRank(graph) {
  const { nodes, adj } = graph;
  const n = nodes.length;
  if (n === 0) return new Map();

  /** @type {Map<string, number>} */
  const rank = new Map();
  const initial = 1 / n;
  for (const id of nodes) rank.set(id, initial);

  for (let iter = 0; iter < PAGERANK_ITERATIONS; iter++) {
    /** @type {Map<string, number>} */
    const next = new Map();
    let danglingSum = 0;

    // Accumulate dangling node mass (nodes with no outgoing edges)
    for (const id of nodes) {
      if (adj.get(id).size === 0) {
        danglingSum += rank.get(id);
      }
    }

    for (const id of nodes) {
      let incoming = 0;
      // Find all nodes that point to id
      for (const src of nodes) {
        if (adj.get(src).has(id)) {
          incoming += rank.get(src) / adj.get(src).size;
        }
      }
      next.set(
        id,
        (1 - DAMPING) / n + DAMPING * (incoming + danglingSum / n)
      );
    }

    // Update ranks
    for (const id of nodes) rank.set(id, next.get(id));
  }

  return rank;
}

// ---------------------------------------------------------------------------
// Betweenness centrality (Brandes' algorithm)
// ---------------------------------------------------------------------------

/**
 * Compute betweenness centrality for all nodes using Brandes' algorithm.
 * Operates on the forward adjacency (unweighted shortest paths).
 * @param {DirectedGraph} graph
 * @returns {Map<string, number>}
 */
function computeBetweenness(graph) {
  const { nodes, adj } = graph;
  /** @type {Map<string, number>} */
  const cb = new Map();
  for (const id of nodes) cb.set(id, 0);

  for (const s of nodes) {
    /** @type {string[]} */
    const stack = [];
    /** @type {Map<string, string[]>} */
    const pred = new Map();
    for (const id of nodes) pred.set(id, []);

    /** @type {Map<string, number>} */
    const sigma = new Map();
    for (const id of nodes) sigma.set(id, 0);
    sigma.set(s, 1);

    /** @type {Map<string, number>} */
    const dist = new Map();
    for (const id of nodes) dist.set(id, -1);
    dist.set(s, 0);

    /** @type {string[]} */
    const queue = [s];
    let qi = 0;

    while (qi < queue.length) {
      const v = queue[qi++];
      stack.push(v);
      const dv = dist.get(v);

      for (const w of adj.get(v)) {
        // Path discovery
        if (dist.get(w) < 0) {
          dist.set(w, dv + 1);
          queue.push(w);
        }
        // Path counting
        if (dist.get(w) === dv + 1) {
          sigma.set(w, sigma.get(w) + sigma.get(v));
          pred.get(w).push(v);
        }
      }
    }

    /** @type {Map<string, number>} */
    const delta = new Map();
    for (const id of nodes) delta.set(id, 0);

    while (stack.length > 0) {
      const w = stack.pop();
      for (const v of pred.get(w)) {
        const d =
          (sigma.get(v) / sigma.get(w)) * (1 + delta.get(w));
        delta.set(v, delta.get(v) + d);
      }
      if (w !== s) {
        cb.set(w, cb.get(w) + delta.get(w));
      }
    }
  }

  // Normalize for directed graph: divide by (n-1)(n-2)
  const n = nodes.length;
  if (n > 2) {
    const norm = (n - 1) * (n - 2);
    for (const id of nodes) {
      cb.set(id, cb.get(id) / norm);
    }
  }

  return cb;
}

// ---------------------------------------------------------------------------
// Degree metrics
// ---------------------------------------------------------------------------

/**
 * Compute in-degree and out-degree for all nodes.
 * @param {DirectedGraph} graph
 * @returns {{ inDegree: Map<string, number>, outDegree: Map<string, number> }}
 */
function computeDegrees(graph) {
  const { nodes, adj, radj } = graph;
  /** @type {Map<string, number>} */
  const inDeg = new Map();
  /** @type {Map<string, number>} */
  const outDeg = new Map();

  for (const id of nodes) {
    inDeg.set(id, radj.get(id).size);
    outDeg.set(id, adj.get(id).size);
  }

  return { inDegree: inDeg, outDegree: outDeg };
}

// ---------------------------------------------------------------------------
// Critical path (longest path in DAG via topological order)
// ---------------------------------------------------------------------------

/**
 * Find the longest dependency chain (critical path) in the graph.
 * If the graph has cycles, returns the longest chain found before cycle nodes.
 * @param {DirectedGraph} graph
 * @param {string[]|null} topoOrder
 * @returns {string[]}
 */
function computeCriticalPath(graph, topoOrder) {
  if (!topoOrder || topoOrder.length === 0) return [];

  const { adj } = graph;
  /** @type {Map<string, number>} */
  const dist = new Map();
  /** @type {Map<string, string|null>} */
  const prev = new Map();

  for (const id of topoOrder) {
    dist.set(id, 0);
    prev.set(id, null);
  }

  for (const u of topoOrder) {
    for (const v of adj.get(u)) {
      if (dist.has(v) && dist.get(u) + 1 > dist.get(v)) {
        dist.set(v, dist.get(u) + 1);
        prev.set(v, u);
      }
    }
  }

  // Find the node with the largest distance
  let maxNode = topoOrder[0];
  let maxDist = 0;
  for (const [id, d] of dist) {
    if (d > maxDist) {
      maxDist = d;
      maxNode = id;
    }
  }

  // Reconstruct path
  /** @type {string[]} */
  const path = [];
  let cur = maxNode;
  while (cur !== null) {
    path.unshift(cur);
    cur = prev.get(cur);
  }

  return path;
}

// ---------------------------------------------------------------------------
// Cycle detection (DFS-based)
// ---------------------------------------------------------------------------

/**
 * Detect all cycles in the directed graph using iterative DFS.
 * Returns an array of cycles, where each cycle is an array of node IDs.
 * @param {DirectedGraph} graph
 * @returns {string[][]}
 */
function detectCycles(graph) {
  const { nodes, adj } = graph;
  /** @type {string[][]} */
  const cycles = [];
  /** @type {Set<string>} */
  const visited = new Set();
  /** @type {Set<string>} */
  const recStack = new Set();
  /** @type {Map<string, string|null>} */
  const parent = new Map();

  /**
   * Recursive DFS for cycle detection.
   * @param {string} node
   */
  function dfs(node) {
    visited.add(node);
    recStack.add(node);

    for (const neighbor of adj.get(node)) {
      if (!visited.has(neighbor)) {
        parent.set(neighbor, node);
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        // Found a cycle — reconstruct it
        /** @type {string[]} */
        const cycle = [neighbor];
        let cur = node;
        while (cur !== neighbor) {
          cycle.unshift(cur);
          cur = parent.get(cur);
        }
        cycle.unshift(neighbor);
        cycles.push(cycle);
      }
    }

    recStack.delete(node);
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      parent.set(node, null);
      dfs(node);
    }
  }

  return cycles;
}

// ---------------------------------------------------------------------------
// Topological sort (Kahn's algorithm)
// ---------------------------------------------------------------------------

/**
 * Compute a topological ordering using Kahn's algorithm.
 * Returns null if the graph contains cycles.
 * @param {DirectedGraph} graph
 * @returns {string[]|null}
 */
function topologicalSort(graph) {
  const { nodes, adj, radj } = graph;
  /** @type {Map<string, number>} */
  const inDeg = new Map();
  for (const id of nodes) {
    inDeg.set(id, radj.get(id).size);
  }

  /** @type {string[]} */
  const queue = [];
  for (const id of nodes) {
    if (inDeg.get(id) === 0) queue.push(id);
  }

  /** @type {string[]} */
  const order = [];
  let qi = 0;

  while (qi < queue.length) {
    const u = queue[qi++];
    order.push(u);
    for (const v of adj.get(u)) {
      const newDeg = inDeg.get(v) - 1;
      inDeg.set(v, newDeg);
      if (newDeg === 0) queue.push(v);
    }
  }

  if (order.length !== nodes.length) return null; // Cycle detected
  return order;
}

// ---------------------------------------------------------------------------
// HITS (hub / authority scores)
// ---------------------------------------------------------------------------

/**
 * Compute HITS hub and authority scores.
 * @param {DirectedGraph} graph
 * @returns {Map<string, {hub: number, authority: number}>}
 */
function computeHITS(graph) {
  const { nodes, adj, radj } = graph;
  const n = nodes.length;
  if (n === 0) return new Map();

  /** @type {Map<string, number>} */
  let auth = new Map();
  /** @type {Map<string, number>} */
  let hub = new Map();

  for (const id of nodes) {
    auth.set(id, 1);
    hub.set(id, 1);
  }

  for (let iter = 0; iter < HITS_ITERATIONS; iter++) {
    // Authority update: auth(v) = sum of hub(u) for all u pointing to v
    /** @type {Map<string, number>} */
    const newAuth = new Map();
    for (const v of nodes) {
      let sum = 0;
      for (const u of radj.get(v)) {
        sum += hub.get(u);
      }
      newAuth.set(v, sum);
    }

    // Hub update: hub(u) = sum of auth(v) for all v that u points to
    /** @type {Map<string, number>} */
    const newHub = new Map();
    for (const u of nodes) {
      let sum = 0;
      for (const v of adj.get(u)) {
        sum += newAuth.get(v);
      }
      newHub.set(u, sum);
    }

    // Normalize
    let authNorm = 0;
    let hubNorm = 0;
    for (const id of nodes) {
      authNorm += newAuth.get(id) ** 2;
      hubNorm += newHub.get(id) ** 2;
    }
    authNorm = Math.sqrt(authNorm) || 1;
    hubNorm = Math.sqrt(hubNorm) || 1;

    for (const id of nodes) {
      newAuth.set(id, newAuth.get(id) / authNorm);
      newHub.set(id, newHub.get(id) / hubNorm);
    }

    auth = newAuth;
    hub = newHub;
  }

  /** @type {Map<string, {hub: number, authority: number}>} */
  const result = new Map();
  for (const id of nodes) {
    result.set(id, { hub: hub.get(id), authority: auth.get(id) });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Execution levels (parallel wave grouping via BFS layers)
// ---------------------------------------------------------------------------

/**
 * Group beads into parallel execution waves. Wave N contains beads whose
 * dependencies are all in waves < N.
 * Returns empty array if graph has cycles.
 * @param {DirectedGraph} graph
 * @returns {string[][]}
 */
function computeExecutionLevels(graph) {
  const { nodes, adj, radj } = graph;
  /** @type {Map<string, number>} */
  const inDeg = new Map();
  for (const id of nodes) {
    inDeg.set(id, radj.get(id).size);
  }

  /** @type {string[]} */
  let frontier = [];
  for (const id of nodes) {
    if (inDeg.get(id) === 0) frontier.push(id);
  }

  /** @type {string[][]} */
  const levels = [];
  const processed = new Set();

  while (frontier.length > 0) {
    levels.push([...frontier]);
    /** @type {string[]} */
    const nextFrontier = [];
    for (const u of frontier) {
      processed.add(u);
      for (const v of adj.get(u)) {
        const newDeg = inDeg.get(v) - 1;
        inDeg.set(v, newDeg);
        if (newDeg === 0) nextFrontier.push(v);
      }
    }
    frontier = nextFrontier;
  }

  // If some nodes were not processed, there are cycles — group as final wave
  if (processed.size < nodes.length) {
    const remaining = nodes.filter((n) => !processed.has(n));
    if (remaining.length > 0) {
      levels.push(remaining);
    }
  }

  return levels;
}

// ---------------------------------------------------------------------------
// Master metrics computation
// ---------------------------------------------------------------------------

/**
 * Compute all graph metrics at once.
 * @param {DirectedGraph} graph
 * @returns {GraphMetrics}
 */
function computeAllMetrics(graph) {
  const pageRank = computePageRank(graph);
  const betweenness = computeBetweenness(graph);
  const { inDegree, outDegree } = computeDegrees(graph);
  const cycles = detectCycles(graph);
  const topoOrder = topologicalSort(graph);
  const criticalPath = computeCriticalPath(graph, topoOrder);
  const hits = computeHITS(graph);
  const executionLevels = computeExecutionLevels(graph);

  return {
    pageRank,
    betweenness,
    inDegree,
    outDegree,
    criticalPath,
    cycles,
    topoOrder,
    hits,
    executionLevels,
  };
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

/**
 * Filter beads by status and domain, returning a new beads object.
 * @param {Record<string, Bead>} beads
 * @param {string|null} statusFilter
 * @param {string|null} domainFilter
 * @returns {Record<string, Bead>}
 */
function filterBeads(beads, statusFilter, domainFilter) {
  /** @type {Record<string, Bead>} */
  const result = {};
  for (const [id, bead] of Object.entries(beads)) {
    if (statusFilter && bead.status !== statusFilter) continue;
    if (domainFilter && bead.domain !== domainFilter) continue;
    result[id] = bead;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/**
 * Compute a composite priority score for a bead.
 * Higher = more urgent.
 * @param {string} id
 * @param {Bead} bead
 * @param {GraphMetrics} metrics
 * @param {Record<string, Bead>} allBeads
 * @returns {number}
 */
function compositeScore(id, bead, metrics, allBeads) {
  const pr = metrics.pageRank.get(id) ?? 0;
  const bc = metrics.betweenness.get(id) ?? 0;
  const outDeg = metrics.outDegree.get(id) ?? 0;

  // Priority weight: p0=3, p1=2, p2=1
  const prioWeight = bead.priority === "p0" ? 3 : bead.priority === "p1" ? 2 : 1;

  // Readiness: fraction of dependencies that are done
  const deps = bead.dependsOn.filter((d) => allBeads[d]);
  const doneDeps = deps.filter((d) => DONE_STATUSES.has(allBeads[d]?.status));
  const readiness = deps.length === 0 ? 1 : doneDeps.length / deps.length;

  // Weighted composite: heavily favor PageRank and betweenness, then fan-out,
  // then explicit priority, then readiness
  return (
    pr * 100 +
    bc * 80 +
    outDeg * 5 +
    prioWeight * 10 +
    readiness * 20
  );
}

/**
 * Determine whether a bead is "ready" (all dependencies done).
 * @param {Bead} bead
 * @param {Record<string, Bead>} allBeads
 * @returns {boolean}
 */
function isReady(bead, allBeads) {
  return bead.dependsOn.every((dep) => {
    const b = allBeads[dep];
    return !b || DONE_STATUSES.has(b.status);
  });
}

/**
 * Get the list of beads that a given bead directly unblocks.
 * @param {string} id
 * @param {DirectedGraph} graph
 * @returns {string[]}
 */
function getUnblocked(id, graph) {
  return [...(graph.adj.get(id) ?? [])];
}

// ---------------------------------------------------------------------------
// Output formatters
// ---------------------------------------------------------------------------

/**
 * Format a number to a fixed-precision string.
 * @param {number} n
 * @param {number} [digits=4]
 * @returns {string}
 */
function fmt(n, digits = 4) {
  return n.toFixed(digits);
}

/**
 * Sort entries by value descending.
 * @param {Map<string, number>} map
 * @returns {Array<[string, number]>}
 */
function sortedDesc(map) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

// ---------------------------------------------------------------------------
// Command: --robot-triage
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, Bead>} allBeads
 * @param {Record<string, Bead>} filteredBeads
 * @param {DirectedGraph} graph
 * @param {GraphMetrics} metrics
 * @param {boolean} jsonOutput
 */
function robotTriage(allBeads, filteredBeads, graph, metrics, jsonOutput) {
  const ids = Object.keys(filteredBeads);
  const totalBeads = Object.keys(allBeads).length;
  const doneCount = Object.values(allBeads).filter((b) => b.status === "done").length;
  const openCount = Object.values(allBeads).filter((b) => ACTIVE_STATUSES.has(b.status) && b.status !== "blocked").length;
  const blockedCount = Object.values(allBeads).filter((b) => b.status === "blocked").length;

  // Classify beads
  const prMedian = median([...metrics.pageRank.values()]);
  const bcMedian = median([...metrics.betweenness.values()]);

  /** @type {Array<{id: string, bead: Bead, pr: number, bc: number, score: number, unblocks: string[]}>} */
  const bottlenecks = [];
  /** @type {Array<{id: string, bead: Bead, pr: number, bc: number, score: number}>} */
  const foundations = [];
  /** @type {Array<{id: string, bead: Bead, score: number}>} */
  const readyFrontier = [];

  for (const id of ids) {
    const bead = filteredBeads[id];
    if (DONE_STATUSES.has(bead.status)) continue;

    const pr = metrics.pageRank.get(id) ?? 0;
    const bc = metrics.betweenness.get(id) ?? 0;
    const score = compositeScore(id, bead, metrics, allBeads);
    const unblocks = getUnblocked(id, graph);

    if (pr >= prMedian && bc >= bcMedian && bc > EPSILON) {
      bottlenecks.push({ id, bead, pr, bc, score, unblocks });
    } else if (pr >= prMedian) {
      foundations.push({ id, bead, pr, bc, score });
    }

    if (isReady(bead, allBeads) && bead.status !== "blocked") {
      readyFrontier.push({ id, bead, score });
    }
  }

  bottlenecks.sort((a, b) => b.score - a.score);
  foundations.sort((a, b) => b.score - a.score);
  readyFrontier.sort((a, b) => b.score - a.score);

  // Orphan beads: no deps AND not depended on
  const orphans = ids.filter((id) => {
    const inD = metrics.inDegree.get(id) ?? 0;
    const outD = metrics.outDegree.get(id) ?? 0;
    return inD === 0 && outD === 0 && filteredBeads[id].dependsOn.length === 0;
  });

  const avgFanOut =
    ids.length === 0
      ? 0
      : ids.reduce((s, id) => s + (metrics.outDegree.get(id) ?? 0), 0) / ids.length;

  if (jsonOutput) {
    const output = {
      generated: new Date().toISOString(),
      summary: { total: totalBeads, open: openCount, done: doneCount, blocked: blockedCount },
      bottlenecks: bottlenecks.map((b) => ({
        id: b.id,
        title: b.bead.title,
        pageRank: b.pr,
        betweenness: b.bc,
        score: b.score,
        unblocks: b.unblocks,
      })),
      foundations: foundations.map((f) => ({
        id: f.id,
        title: f.bead.title,
        pageRank: f.pr,
        betweenness: f.bc,
        score: f.score,
      })),
      readyFrontier: readyFrontier.map((r) => ({
        id: r.id,
        title: r.bead.title,
        domain: r.bead.domain,
        priority: r.bead.priority,
        score: r.score,
      })),
      executionWaves: metrics.executionLevels,
      graphHealth: {
        cyclesDetected: metrics.cycles.length > 0,
        cycles: metrics.cycles,
        orphanBeads: orphans,
        maxChainDepth: metrics.criticalPath.length,
        averageFanOut: avgFanOut,
      },
    };
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    return;
  }

  const lines = [];
  lines.push("=== BV TRIAGE REPORT ===");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(
    `Total beads: ${totalBeads} | Open: ${openCount} | Done: ${doneCount} | Blocked: ${blockedCount}`
  );
  lines.push("");

  // Bottlenecks
  lines.push("--- CRITICAL BOTTLENECKS (High PageRank + High Betweenness) ---");
  if (bottlenecks.length === 0) {
    lines.push("  (none — no active bottlenecks detected)");
  }
  for (const b of bottlenecks) {
    lines.push(
      `${b.id} | PR: ${fmt(b.pr)} | BC: ${fmt(b.bc)} | "${b.bead.title}"`
    );
    lines.push("  -> Action: DROP EVERYTHING, complete this first");
    lines.push(
      `  -> Unblocks: ${b.unblocks.length > 0 ? b.unblocks.join(", ") : "(none)"}`
    );
  }
  lines.push("");

  // Foundations
  lines.push("--- FOUNDATION PIECES (High PageRank + Low Betweenness) ---");
  if (foundations.length === 0) {
    lines.push("  (none — no foundation pieces in active set)");
  }
  for (const f of foundations) {
    lines.push(
      `${f.id} | PR: ${fmt(f.pr)} | BC: ${fmt(f.bc)} | "${f.bead.title}"`
    );
  }
  lines.push("");

  // Ready frontier
  lines.push("--- READY FRONTIER (no unresolved dependencies) ---");
  if (readyFrontier.length === 0) {
    lines.push("  (none — all remaining beads have unresolved dependencies)");
  }
  for (const r of readyFrontier) {
    lines.push(
      `${r.id} | Priority: ${r.bead.priority} | "${r.bead.title}"`
    );
    lines.push(`  -> Claim: bv claim ${r.id}`);
    lines.push(`  -> Domain: ${r.bead.domain}`);
  }
  lines.push("");

  // Execution waves
  lines.push("--- PARALLEL EXECUTION WAVES ---");
  if (metrics.executionLevels.length === 0) {
    lines.push("  (empty graph — no waves to compute)");
  }
  for (let i = 0; i < metrics.executionLevels.length; i++) {
    const wave = metrics.executionLevels[i];
    lines.push(`Wave ${i + 1}: [${wave.join(", ")}] (can run simultaneously)`);
  }
  lines.push("");

  // Graph health
  lines.push("--- GRAPH HEALTH ---");
  lines.push(`Cycles detected: ${metrics.cycles.length > 0 ? "yes" : "no"}`);
  if (metrics.cycles.length > 0) {
    for (const cycle of metrics.cycles) {
      lines.push(`  Cycle: ${cycle.join(" -> ")}`);
    }
  }
  lines.push(
    `Orphan beads (no deps, not depended on): ${orphans.length > 0 ? orphans.join(", ") : "(none)"}`
  );
  lines.push(`Max chain depth: ${metrics.criticalPath.length}`);
  lines.push(`Average fan-out: ${fmt(avgFanOut, 2)}`);

  process.stdout.write(lines.join("\n") + "\n");
}

// ---------------------------------------------------------------------------
// Command: --robot-next
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, Bead>} allBeads
 * @param {Record<string, Bead>} filteredBeads
 * @param {GraphMetrics} metrics
 * @param {boolean} jsonOutput
 */
function robotNext(allBeads, filteredBeads, metrics, jsonOutput) {
  /** @type {Array<{id: string, bead: Bead, score: number}>} */
  const candidates = [];

  for (const [id, bead] of Object.entries(filteredBeads)) {
    if (DONE_STATUSES.has(bead.status)) continue;
    if (bead.status === "blocked") continue;
    if (!isReady(bead, allBeads)) continue;

    const score = compositeScore(id, bead, metrics, allBeads);
    candidates.push({ id, bead, score });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    if (jsonOutput) {
      process.stdout.write(JSON.stringify({ pick: null, reason: "No actionable beads found" }) + "\n");
    } else {
      process.stdout.write("No actionable beads found. All beads are done, blocked, or have unresolved dependencies.\n");
    }
    return;
  }

  const top = candidates[0];

  if (jsonOutput) {
    process.stdout.write(
      JSON.stringify(
        {
          pick: {
            id: top.id,
            title: top.bead.title,
            domain: top.bead.domain,
            priority: top.bead.priority,
            score: top.score,
          },
          claim: `node tools/bv.mjs claim ${top.id}`,
        },
        null,
        2
      ) + "\n"
    );
  } else {
    process.stdout.write(`TOP PICK: ${top.id} | "${top.bead.title}"\n`);
    process.stdout.write(`  Domain: ${top.bead.domain} | Priority: ${top.bead.priority} | Score: ${fmt(top.score, 2)}\n`);
    process.stdout.write(`  Claim:  node tools/bv.mjs claim ${top.id}\n`);
  }
}

// ---------------------------------------------------------------------------
// Command: --robot-plan
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, Bead>} allBeads
 * @param {Record<string, Bead>} filteredBeads
 * @param {DirectedGraph} graph
 * @param {GraphMetrics} metrics
 * @param {boolean} jsonOutput
 */
function robotPlan(allBeads, filteredBeads, graph, metrics, jsonOutput) {
  // Build waves of only non-done beads, preserving dependency order
  const activeLevels = metrics.executionLevels.map((wave) =>
    wave.filter((id) => filteredBeads[id] && !DONE_STATUSES.has(filteredBeads[id].status))
  ).filter((wave) => wave.length > 0);

  if (jsonOutput) {
    const output = {
      waves: activeLevels.map((wave, i) => ({
        wave: i + 1,
        beads: wave.map((id) => ({
          id,
          title: filteredBeads[id]?.title ?? allBeads[id]?.title ?? "unknown",
          unblocks: getUnblocked(id, graph).filter(
            (uid) => filteredBeads[uid] && !DONE_STATUSES.has(filteredBeads[uid].status)
          ),
        })),
      })),
    };
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    return;
  }

  process.stdout.write("=== PARALLEL EXECUTION PLAN ===\n\n");
  if (activeLevels.length === 0) {
    process.stdout.write("All beads are done. Nothing to plan.\n");
    return;
  }

  for (let i = 0; i < activeLevels.length; i++) {
    const wave = activeLevels[i];
    process.stdout.write(`--- Wave ${i + 1} (${wave.length} beads, can run simultaneously) ---\n`);
    for (const id of wave) {
      const bead = filteredBeads[id] ?? allBeads[id];
      const unblocks = getUnblocked(id, graph).filter(
        (uid) => filteredBeads[uid] && !DONE_STATUSES.has(filteredBeads[uid].status)
      );
      process.stdout.write(`  ${id} | ${bead.priority} | "${bead.title}"\n`);
      if (unblocks.length > 0) {
        process.stdout.write(`    Unblocks: ${unblocks.join(", ")}\n`);
      }
    }
    process.stdout.write("\n");
  }
}

// ---------------------------------------------------------------------------
// Command: --robot-insights
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, Bead>} filteredBeads
 * @param {DirectedGraph} graph
 * @param {GraphMetrics} metrics
 * @param {boolean} jsonOutput
 */
function robotInsights(filteredBeads, graph, metrics, jsonOutput) {
  const ids = Object.keys(filteredBeads);

  if (jsonOutput) {
    /** @type {Record<string, Record<string, unknown>>} */
    const perBead = {};
    for (const id of ids) {
      perBead[id] = {
        title: filteredBeads[id].title,
        status: filteredBeads[id].status,
        domain: filteredBeads[id].domain,
        priority: filteredBeads[id].priority,
        pageRank: metrics.pageRank.get(id) ?? 0,
        betweenness: metrics.betweenness.get(id) ?? 0,
        inDegree: metrics.inDegree.get(id) ?? 0,
        outDegree: metrics.outDegree.get(id) ?? 0,
        hub: metrics.hits.get(id)?.hub ?? 0,
        authority: metrics.hits.get(id)?.authority ?? 0,
      };
    }
    const output = {
      metrics: perBead,
      criticalPath: metrics.criticalPath,
      cycles: metrics.cycles,
      topoOrder: metrics.topoOrder,
      executionLevels: metrics.executionLevels,
    };
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
    return;
  }

  const lines = [];
  lines.push("=== FULL GRAPH METRICS DUMP ===\n");

  // Per-bead table
  lines.push("--- PER-BEAD METRICS ---");
  lines.push(
    padRight("ID", 12) +
      padRight("Status", 14) +
      padRight("PR", 10) +
      padRight("BC", 10) +
      padRight("In", 5) +
      padRight("Out", 5) +
      padRight("Hub", 10) +
      padRight("Auth", 10) +
      "Title"
  );
  lines.push("-".repeat(100));

  const sorted = sortedDesc(metrics.pageRank);
  for (const [id] of sorted) {
    if (!filteredBeads[id]) continue;
    const bead = filteredBeads[id];
    lines.push(
      padRight(id, 12) +
        padRight(bead.status, 14) +
        padRight(fmt(metrics.pageRank.get(id) ?? 0), 10) +
        padRight(fmt(metrics.betweenness.get(id) ?? 0), 10) +
        padRight(String(metrics.inDegree.get(id) ?? 0), 5) +
        padRight(String(metrics.outDegree.get(id) ?? 0), 5) +
        padRight(fmt(metrics.hits.get(id)?.hub ?? 0), 10) +
        padRight(fmt(metrics.hits.get(id)?.authority ?? 0), 10) +
        `"${bead.title}"`
    );
  }
  lines.push("");

  // Critical path
  lines.push("--- CRITICAL PATH (longest dependency chain) ---");
  if (metrics.criticalPath.length === 0) {
    lines.push("  (empty or cyclic graph)");
  } else {
    lines.push(`  Length: ${metrics.criticalPath.length}`);
    lines.push(`  Path:   ${metrics.criticalPath.join(" -> ")}`);
  }
  lines.push("");

  // Cycles
  lines.push("--- CYCLES ---");
  if (metrics.cycles.length === 0) {
    lines.push("  No cycles detected.");
  } else {
    for (const cycle of metrics.cycles) {
      lines.push(`  ${cycle.join(" -> ")}`);
    }
  }
  lines.push("");

  // Topological order
  lines.push("--- TOPOLOGICAL ORDER ---");
  if (!metrics.topoOrder) {
    lines.push("  (not available — graph has cycles)");
  } else {
    lines.push(`  ${metrics.topoOrder.join(", ")}`);
  }
  lines.push("");

  // Execution levels
  lines.push("--- EXECUTION LEVELS ---");
  for (let i = 0; i < metrics.executionLevels.length; i++) {
    lines.push(`  Level ${i + 1}: ${metrics.executionLevels[i].join(", ")}`);
  }

  process.stdout.write(lines.join("\n") + "\n");
}

// ---------------------------------------------------------------------------
// Command: --robot-priority
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, Bead>} allBeads
 * @param {Record<string, Bead>} filteredBeads
 * @param {GraphMetrics} metrics
 * @param {boolean} jsonOutput
 */
function robotPriority(allBeads, filteredBeads, metrics, jsonOutput) {
  /** @type {Array<{id: string, bead: Bead, score: number, ready: boolean, confidence: number}>} */
  const ranked = [];

  for (const [id, bead] of Object.entries(filteredBeads)) {
    if (DONE_STATUSES.has(bead.status)) continue;

    const score = compositeScore(id, bead, metrics, allBeads);
    const ready = isReady(bead, allBeads);

    // Confidence: how certain we are this should be next
    // Based on: score magnitude relative to max, readiness, and priority alignment
    const pr = metrics.pageRank.get(id) ?? 0;
    const bc = metrics.betweenness.get(id) ?? 0;
    const maxPr = Math.max(...[...metrics.pageRank.values()], EPSILON);
    const maxBc = Math.max(...[...metrics.betweenness.values()], EPSILON);
    const normPr = pr / maxPr;
    const normBc = bc / maxBc;
    const confidence = Math.min(
      1,
      (normPr * 0.4 + normBc * 0.3 + (ready ? 0.3 : 0)) * 1.0
    );

    ranked.push({ id, bead, score, ready, confidence });
  }

  ranked.sort((a, b) => b.score - a.score);

  if (jsonOutput) {
    process.stdout.write(
      JSON.stringify(
        ranked.map((r) => ({
          id: r.id,
          title: r.bead.title,
          domain: r.bead.domain,
          priority: r.bead.priority,
          status: r.bead.status,
          compositeScore: r.score,
          ready: r.ready,
          confidence: r.confidence,
        })),
        null,
        2
      ) + "\n"
    );
    return;
  }

  process.stdout.write("=== PRIORITY RECOMMENDATIONS ===\n\n");
  if (ranked.length === 0) {
    process.stdout.write("No active beads to prioritize.\n");
    return;
  }

  for (const r of ranked) {
    const readyTag = r.ready ? "[READY]" : "[BLOCKED]";
    const confBar = confidenceBar(r.confidence);
    process.stdout.write(
      `${r.id} | ${r.bead.priority} | ${readyTag} | Confidence: ${confBar} ${(r.confidence * 100).toFixed(0)}% | Score: ${fmt(r.score, 2)}\n`
    );
    process.stdout.write(`  "${r.bead.title}" (${r.bead.domain})\n\n`);
  }
}

// ---------------------------------------------------------------------------
// Command: --robot-diff
// ---------------------------------------------------------------------------

/**
 * @param {Record<string, Bead>} allBeads
 * @param {string|null} diffSince
 * @param {boolean} jsonOutput
 */
function robotDiff(allBeads, diffSince, jsonOutput) {
  if (!diffSince) {
    fatal("--robot-diff requires --diff-since <status>");
  }

  // Status ordering for comparison
  /** @type {Record<string, number>} */
  const statusOrder = {
    open: 0,
    claimed: 1,
    implementing: 2,
    verifying: 3,
    done: 4,
    blocked: -1,
  };

  const sinceLevel = statusOrder[diffSince];
  if (sinceLevel === undefined) {
    fatal(
      `Unknown status "${diffSince}". Valid: ${STATUSES.join(", ")}`
    );
  }

  /** @type {Array<{id: string, title: string, status: BeadStatus, domain: string}>} */
  const changed = [];

  for (const [id, bead] of Object.entries(allBeads)) {
    const beadLevel = statusOrder[bead.status] ?? -1;
    if (beadLevel > sinceLevel) {
      changed.push({ id, title: bead.title, status: bead.status, domain: bead.domain });
    }
  }

  changed.sort((a, b) => (statusOrder[b.status] ?? 0) - (statusOrder[a.status] ?? 0));

  if (jsonOutput) {
    process.stdout.write(JSON.stringify(changed, null, 2) + "\n");
    return;
  }

  process.stdout.write(`=== BEADS CHANGED SINCE "${diffSince}" ===\n\n`);
  if (changed.length === 0) {
    process.stdout.write("No beads have advanced beyond that status.\n");
    return;
  }

  for (const c of changed) {
    process.stdout.write(`${c.id} | ${c.status} | ${c.domain} | "${c.title}"\n`);
  }
  process.stdout.write(`\nTotal: ${changed.length} beads\n`);
}

// ---------------------------------------------------------------------------
// Subcommands: claim, complete
// ---------------------------------------------------------------------------

/**
 * @param {string} repoRoot
 * @param {StatusFile} data
 * @param {string} beadId
 * @param {BeadStatus} newStatus
 */
function setBeadStatus(repoRoot, data, beadId, newStatus) {
  const bead = data.beads[beadId];
  if (!bead) {
    fatal(`Bead "${beadId}" not found in .beads/.status.json`);
  }

  const oldStatus = bead.status;
  bead.status = newStatus;
  writeStatusFile(repoRoot, data);

  process.stdout.write(
    `${beadId}: ${oldStatus} -> ${newStatus}\n`
  );
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function printHelp() {
  const help = `
bv — Bead Value graph-theory triage tool

USAGE
  node tools/bv.mjs <command> [options]

COMMANDS
  --robot-triage          Full triage report with bottlenecks, frontiers, waves, health
  --robot-next            Single top pick with claim command
  --robot-plan            Parallel execution tracks with unblock lists
  --robot-insights        Full per-bead graph metrics dump
  --robot-priority        Priority recommendations with confidence scores
  --robot-diff            Show beads changed since a given status
  claim <bead-id>         Set a bead's status to "claimed"
  complete <bead-id>      Set a bead's status to "done"

OPTIONS
  --diff-since <status>   Required with --robot-diff. Filter by advancement.
  --status <status>       Filter to beads with this status (default: all non-done)
  --domain <domain>       Filter to a specific domain
  --json                  Output as JSON instead of formatted text
  --help, -h              Show this help

EXAMPLES
  node tools/bv.mjs --robot-triage
  node tools/bv.mjs --robot-next --domain orchestration
  node tools/bv.mjs --robot-plan --json
  node tools/bv.mjs --robot-insights --status open
  node tools/bv.mjs --robot-diff --diff-since open
  node tools/bv.mjs claim ORCH-001
  node tools/bv.mjs complete ORCH-001
`.trim();
  process.stdout.write(help + "\n");
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Print an error message and exit with code 1.
 * @param {string} msg
 * @returns {never}
 */
function fatal(msg) {
  process.stderr.write(`bv: error: ${msg}\n`);
  process.exit(1);
}

/**
 * Pad a string to a minimum width.
 * @param {string} s
 * @param {number} width
 * @returns {string}
 */
function padRight(s, width) {
  return s.length >= width ? s + " " : s + " ".repeat(width - s.length);
}

/**
 * Compute the median of a numeric array.
 * @param {number[]} arr
 * @returns {number}
 */
function median(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Render a visual confidence bar.
 * @param {number} confidence 0..1
 * @returns {string}
 */
function confidenceBar(confidence) {
  const filled = Math.round(confidence * 10);
  return "[" + "#".repeat(filled) + "-".repeat(10 - filled) + "]";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const flags = parseArgs(process.argv);

  if (flags.help) {
    printHelp();
    return;
  }

  const repoRoot = findRepoRoot();
  const data = readStatusFile(repoRoot);

  // Handle subcommands
  if (flags.subcommand === "claim") {
    setBeadStatus(repoRoot, data, flags.subcommandArg, "claimed");
    return;
  }
  if (flags.subcommand === "complete") {
    setBeadStatus(repoRoot, data, flags.subcommandArg, "done");
    return;
  }

  // Check that at least one command flag is set
  const hasCommand =
    flags.robotTriage ||
    flags.robotNext ||
    flags.robotPlan ||
    flags.robotInsights ||
    flags.robotPriority ||
    flags.robotDiff;

  if (!hasCommand) {
    printHelp();
    return;
  }

  // Apply default filter: exclude done beads unless --status is explicitly set
  const effectiveStatus = flags.status ?? null;
  const allBeads = data.beads;

  /** @type {Record<string, Bead>} */
  let filteredBeads;
  if (effectiveStatus) {
    filteredBeads = filterBeads(allBeads, effectiveStatus, flags.domain);
  } else if (flags.domain) {
    filteredBeads = filterBeads(allBeads, null, flags.domain);
  } else {
    // Default: include all beads for graph computation (need full graph)
    filteredBeads = { ...allBeads };
  }

  // Build graph on the FULL bead set (metrics need full topology)
  const graph = buildGraph(allBeads);
  const metrics = computeAllMetrics(graph);

  // Dispatch commands
  if (flags.robotTriage) {
    robotTriage(allBeads, filteredBeads, graph, metrics, flags.json);
  }
  if (flags.robotNext) {
    robotNext(allBeads, filteredBeads, metrics, flags.json);
  }
  if (flags.robotPlan) {
    robotPlan(allBeads, filteredBeads, graph, metrics, flags.json);
  }
  if (flags.robotInsights) {
    robotInsights(filteredBeads, graph, metrics, flags.json);
  }
  if (flags.robotPriority) {
    robotPriority(allBeads, filteredBeads, metrics, flags.json);
  }
  if (flags.robotDiff) {
    robotDiff(allBeads, flags.diffSince, flags.json);
  }
}

main();
