#!/usr/bin/env node

/**
 * Destructive Command Guard (DCG)
 *
 * Mechanically blocks dangerous operations in the development environment.
 * Can run as a standalone validator or be installed as a git pre-commit hook.
 *
 * Usage:
 *   node tools/dcg.mjs <command...>    Validate a command before execution
 *   node tools/dcg.mjs --test          Run self-tests
 *   node tools/dcg.mjs --install       Install as git pre-commit hook
 *   node tools/dcg.mjs --check-staged  Check staged files for dangerous patterns
 *   node tools/dcg.mjs --help          Show usage
 *
 * Exit codes:
 *   0 = command is safe (allowed)
 *   1 = command is blocked (destructive)
 *   2 = error (invalid usage)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// ANSI colors
// ---------------------------------------------------------------------------

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

// ---------------------------------------------------------------------------
// Destructive command patterns
// ---------------------------------------------------------------------------

/** @typedef {{ pattern: RegExp, description: string, alternative: string, severity: 'critical' | 'high' | 'medium' }} DestructivePattern */

/** @type {DestructivePattern[]} */
const DESTRUCTIVE_PATTERNS = [
  {
    pattern: /\bgit\s+reset\s+--hard\b/,
    description: "git reset --hard destroys uncommitted changes irrecoverably",
    alternative: "git stash  (preserves changes, recoverable)",
    severity: "critical",
  },
  {
    pattern: /\bgit\s+clean\s+-f[d]?\b/,
    description: "git clean -fd deletes untracked files and directories permanently",
    alternative: "git clean -fdn  (preview first, then decide)",
    severity: "critical",
  },
  {
    pattern: /\bgit\s+checkout\s+--\s+\S/,
    description: "git checkout -- <file> discards uncommitted changes to the file",
    alternative: "git stash push <file>  (preserves changes, recoverable)",
    severity: "high",
  },
  {
    pattern: /\bgit\s+push\s+--force(?!\s*-with-lease)\b/,
    description: "git push --force can overwrite remote history and other people's work",
    alternative: "git push --force-with-lease  (checks remote unchanged first)",
    severity: "critical",
  },
  {
    pattern: /\brm\s+-rf?\s+(?:\/|\.\.\/|[A-Za-z]:\\)/,
    description: "rm -rf on absolute or parent paths can destroy critical data",
    alternative: "rm -ri <path>  (interactive confirmation before each delete)",
    severity: "critical",
  },
  {
    pattern: /\bgit\s+branch\s+-D\b/,
    description: "git branch -D force-deletes a branch even if not merged",
    alternative: "git branch -d  (safe delete, fails if unmerged)",
    severity: "medium",
  },
  {
    pattern: /\bgit\s+rebase\s+-i\b/,
    description: "Interactive rebase requires a TTY and can rewrite history",
    alternative: "git rebase <branch>  (non-interactive, or use in a terminal)",
    severity: "medium",
  },
  {
    pattern: /\bdrop\s+(?:table|database|schema)\b/i,
    description: "DROP TABLE/DATABASE/SCHEMA destroys data permanently",
    alternative: "Use migrations with rollback support",
    severity: "critical",
  },
  {
    pattern: /\bkubectl\s+delete\s+(?:namespace|ns)\b/,
    description: "kubectl delete namespace destroys all resources in the namespace",
    alternative: "kubectl delete <resource> <name>  (targeted deletion)",
    severity: "critical",
  },
  {
    pattern: /\bterraform\s+destroy\b/,
    description: "terraform destroy tears down all managed infrastructure",
    alternative: "terraform plan -destroy  (preview first, then confirm)",
    severity: "critical",
  },
  {
    pattern: /\bdocker\s+system\s+prune\s+-a\b/,
    description: "docker system prune -a removes all unused images, containers, and volumes",
    alternative: "docker system prune  (without -a, keeps tagged images)",
    severity: "medium",
  },
];

// ---------------------------------------------------------------------------
// Staged file patterns (for pre-commit hook)
// ---------------------------------------------------------------------------

/** @typedef {{ pattern: RegExp, description: string }} StagedPattern */

/** @type {StagedPattern[]} */
const STAGED_FILE_PATTERNS = [
  { pattern: /\.env$/, description: "Staging .env files may expose secrets" },
  { pattern: /\.env\.local$/, description: "Staging .env.local may expose secrets" },
  { pattern: /credentials\.json$/, description: "Staging credentials may expose secrets" },
  { pattern: /\.pem$/, description: "Staging PEM files may expose private keys" },
  { pattern: /id_rsa/, description: "Staging SSH keys may expose private keys" },
];

// ---------------------------------------------------------------------------
// Core validation
// ---------------------------------------------------------------------------

/**
 * Check a command string against destructive patterns.
 * @param {string} command
 * @returns {{ blocked: boolean, matches: DestructivePattern[] }}
 */
function validateCommand(command) {
  const matches = DESTRUCTIVE_PATTERNS.filter((p) => p.pattern.test(command));
  return { blocked: matches.length > 0, matches };
}

/**
 * Check staged files for dangerous patterns.
 * @returns {{ blocked: boolean, matches: Array<{ file: string, reason: string }> }}
 */
function checkStagedFiles() {
  let staged;
  try {
    staged = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf-8" }).trim();
  } catch {
    return { blocked: false, matches: [] };
  }

  if (!staged) return { blocked: false, matches: [] };

  const files = staged.split("\n").filter(Boolean);
  /** @type {Array<{ file: string, reason: string }>} */
  const matches = [];

  for (const file of files) {
    for (const pattern of STAGED_FILE_PATTERNS) {
      if (pattern.pattern.test(file)) {
        matches.push({ file, reason: pattern.description });
      }
    }
  }

  return { blocked: matches.length > 0, matches };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

/**
 * @param {DestructivePattern} match
 */
function formatBlockedCommand(match) {
  const sev =
    match.severity === "critical"
      ? `${RED}${BOLD}CRITICAL${RESET}`
      : match.severity === "high"
        ? `${RED}HIGH${RESET}`
        : `${YELLOW}MEDIUM${RESET}`;

  console.error(`${RED}${BOLD}BLOCKED${RESET} [${sev}]`);
  console.error(`  ${match.description}`);
  console.error(`  ${GREEN}Safe alternative:${RESET} ${match.alternative}`);
  console.error();
}

// ---------------------------------------------------------------------------
// Self-tests
// ---------------------------------------------------------------------------

function runTests() {
  let passed = 0;
  let failed = 0;

  /** @param {string} name @param {boolean} condition */
  function assert(name, condition) {
    if (condition) {
      console.log(`  ${GREEN}PASS${RESET} ${name}`);
      passed++;
    } else {
      console.error(`  ${RED}FAIL${RESET} ${name}`);
      failed++;
    }
  }

  console.log(`${BOLD}DCG Self-Tests${RESET}\n`);

  // Should block
  assert("git reset --hard", validateCommand("git reset --hard HEAD~1").blocked);
  assert("git clean -fd", validateCommand("git clean -fd").blocked);
  assert("git checkout -- file", validateCommand("git checkout -- src/main.ts").blocked);
  assert("git push --force", validateCommand("git push --force origin main").blocked);
  assert("rm -rf /", validateCommand("rm -rf /etc").blocked);
  assert("rm -rf ../", validateCommand("rm -rf ../data").blocked);
  assert("git branch -D", validateCommand("git branch -D feature/old").blocked);
  assert("DROP TABLE", validateCommand("DROP TABLE users;").blocked);
  assert("kubectl delete namespace", validateCommand("kubectl delete namespace production").blocked);
  assert("terraform destroy", validateCommand("terraform destroy -auto-approve").blocked);

  // Should allow
  assert("git add .", !validateCommand("git add .").blocked);
  assert("git commit -m", !validateCommand('git commit -m "fix"').blocked);
  assert("git push", !validateCommand("git push origin main").blocked);
  assert("git push --force-with-lease", !validateCommand("git push --force-with-lease").blocked);
  assert("git stash", !validateCommand("git stash").blocked);
  assert("npm install", !validateCommand("npm install express").blocked);
  assert("git branch -d (safe)", !validateCommand("git branch -d feature/old").blocked);
  assert("rm single file", !validateCommand("rm src/old-file.ts").blocked);
  assert("git clean -fdn (preview)", !validateCommand("git clean -fdn").blocked);

  console.log(`\n${BOLD}Results:${RESET} ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Hook installation
// ---------------------------------------------------------------------------

function installHook() {
  let gitDir;
  try {
    gitDir = execFileSync("git", ["rev-parse", "--git-dir"], { encoding: "utf-8" }).trim();
  } catch {
    console.error(`${RED}Not a git repository${RESET}`);
    process.exit(2);
  }

  const hooksDir = join(gitDir, "hooks");
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  const hookPath = join(hooksDir, "pre-commit");
  const hookContent = `#!/bin/sh
# Destructive Command Guard - installed by tools/dcg.mjs
node tools/dcg.mjs --check-staged
`;

  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf-8");
    if (existing.includes("dcg.mjs")) {
      console.log(`${YELLOW}DCG hook already installed at ${hookPath}${RESET}`);
      return;
    }
    writeFileSync(hookPath, existing + "\n" + hookContent.split("\n").slice(1).join("\n"));
    console.log(`${GREEN}DCG hook appended to existing pre-commit hook${RESET}`);
  } else {
    writeFileSync(hookPath, hookContent, { mode: 0o755 });
    console.log(`${GREEN}DCG hook installed at ${hookPath}${RESET}`);
  }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function showHelp() {
  console.log(`${BOLD}Destructive Command Guard (DCG)${RESET}

${CYAN}Usage:${RESET}
  node tools/dcg.mjs <command...>    Validate a command before execution
  node tools/dcg.mjs --test          Run self-tests
  node tools/dcg.mjs --install       Install as git pre-commit hook
  node tools/dcg.mjs --check-staged  Check staged files for dangerous patterns
  node tools/dcg.mjs --help          Show this help

${CYAN}Exit codes:${RESET}
  0 = command is safe (allowed)
  1 = command is blocked (destructive)
  2 = error (invalid usage)

${CYAN}Blocked patterns:${RESET}`);

  for (const p of DESTRUCTIVE_PATTERNS) {
    const sev =
      p.severity === "critical"
        ? `${RED}CRITICAL${RESET}`
        : p.severity === "high"
          ? `${RED}HIGH${RESET}`
          : `${YELLOW}MEDIUM${RESET}`;
    console.log(`  [${sev}] ${p.description}`);
    console.log(`           ${GREEN}Alternative:${RESET} ${p.alternative}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.length === 0) {
  showHelp();
  process.exit(2);
}

if (args[0] === "--test") {
  runTests();
} else if (args[0] === "--install") {
  installHook();
} else if (args[0] === "--check-staged") {
  const result = checkStagedFiles();
  if (result.blocked) {
    console.error(`\n${RED}${BOLD}DCG: Blocked commit — dangerous files staged${RESET}\n`);
    for (const m of result.matches) {
      console.error(`  ${RED}BLOCKED${RESET} ${m.file}`);
      console.error(`    ${m.reason}`);
    }
    console.error(`\n  ${YELLOW}Unstage these files or use --no-verify to bypass (not recommended)${RESET}\n`);
    process.exit(1);
  }
  process.exit(0);
} else if (args[0] === "--help") {
  showHelp();
} else {
  const command = args.join(" ");
  const result = validateCommand(command);

  if (result.blocked) {
    console.error(`\n${RED}${BOLD}DCG: Command blocked${RESET}\n`);
    for (const match of result.matches) {
      formatBlockedCommand(match);
    }
    process.exit(1);
  } else {
    process.exit(0);
  }
}
