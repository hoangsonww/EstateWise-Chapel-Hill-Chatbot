#!/usr/bin/env bash
# Destructive Command Guard (DCG)
# Blocks dangerous commands that could cause irreversible damage.
# Installed as a Claude Code pre-command hook.

set -euo pipefail

COMMAND="${1:-}"

if [ -z "$COMMAND" ]; then
  exit 0
fi

blocked() {
  echo "BLOCKED by Destructive Command Guard (DCG)"
  echo "Command: $COMMAND"
  echo "Reason: $1"
  echo ""
  echo "If you truly need to run this command, ask the user for explicit confirmation."
  exit 1
}

# rm -rf / or rm -rf with dangerous targets
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*r[a-zA-Z]*f|--recursive\s+--force|-[a-zA-Z]*f[a-zA-Z]*r)\s'; then
  blocked "Recursive force delete detected. This can permanently destroy files."
fi

# Force push to main/master
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force.*\s+(main|master)'; then
  blocked "Force push to main/master can rewrite shared history."
fi
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*\s+(main|master)\s+.*--force'; then
  blocked "Force push to main/master can rewrite shared history."
fi

# git reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  blocked "git reset --hard discards all uncommitted changes permanently."
fi

# git clean -fdx
if echo "$COMMAND" | grep -qE 'git\s+clean\s+-[a-zA-Z]*f[a-zA-Z]*d[a-zA-Z]*x'; then
  blocked "git clean -fdx removes all untracked files and directories including ignored ones."
fi
if echo "$COMMAND" | grep -qE 'git\s+clean\s+-fdx'; then
  blocked "git clean -fdx removes all untracked files and directories including ignored ones."
fi

# DROP TABLE / DROP DATABASE
if echo "$COMMAND" | grep -qiE 'DROP\s+(TABLE|DATABASE)'; then
  blocked "DROP TABLE/DATABASE is an irreversible data deletion operation."
fi

# TRUNCATE
if echo "$COMMAND" | grep -qiE 'TRUNCATE\s'; then
  blocked "TRUNCATE removes all rows from a table without logging individual row deletions."
fi

# docker system prune -a
if echo "$COMMAND" | grep -qE 'docker\s+system\s+prune\s+-a'; then
  blocked "docker system prune -a removes all unused images, containers, and volumes."
fi

# kubectl delete namespace
if echo "$COMMAND" | grep -qE 'kubectl\s+delete\s+namespace'; then
  blocked "kubectl delete namespace destroys all resources within the namespace."
fi

# terraform destroy
if echo "$COMMAND" | grep -qE 'terraform\s+destroy'; then
  blocked "terraform destroy tears down all managed infrastructure."
fi

exit 0
