# Skill: Add Agent

Register a new agent in the EstateWise agentic-ai orchestration system.

## When to Use

Use when adding a new specialized agent (e.g., a mortgage calculator agent, a neighborhood safety agent) to the multi-agent system.

## Steps

### 1. Define the Agent

Determine:

- **ID**: lowercase kebab-case (e.g., `mortgage-calc`, `neighborhood-safety`)
- **Model**: which LLM to use (`claude-sonnet-4-20250514`, `gpt-4o-mini`, `gemini-2.0-flash`, etc.)
- **Cost tier**: `low` | `medium` | `high`
- **Capabilities**: list of capability tags (e.g., `["financial", "calculation"]`)
- **MCP tools**: which MCP tools this agent is allowed to call
- **Fallback**: agent ID to fall back to if this agent fails

### 2. Create System Prompt

Create the agent's system prompt in `agentic-ai/src/prompts/agents/<agent-id>.ts`:

```typescript
export const AGENT_PROMPT = {
  id: "<agent-id>",
  version: "1.0.0",
  system: `<role>You are the EstateWise <Agent Name>.</role>
<capabilities>
- Capability 1
- Capability 2
</capabilities>
<grounding-rules>
- Only use data from provided MCP tool results.
- Never fabricate property prices, addresses, or statistics.
- If data is unavailable, say so explicitly.
</grounding-rules>
<output-format>
Respond with structured JSON when the orchestrator requests it.
Otherwise use clear, concise natural language.
</output-format>`,
};
```

### 3. Register in Agent Registry

Add the agent definition to the registry in `agentic-ai/src/orchestration/registry.ts`:

```typescript
registry.register({
  id: "<agent-id>",
  name: "Human-Readable Name",
  model: "claude-sonnet-4-20250514",
  costTier: "medium",
  capabilities: ["financial", "calculation"],
  fallback: "general-assistant",
  maxIterations: 5,
  timeoutMs: 30000,
});
```

### 4. Add MCP Permissions

Define which MCP tools this agent can call in the permissions config:

```typescript
// agentic-ai/src/orchestration/permissions.ts
permissions["<agent-id>"] = [
  "property-search",
  "property-details",
  "mortgage-calculate",
];
```

### 5. Update Supervisor Routing

Add the agent to the intent classifier / supervisor routing table so queries are routed correctly:

```typescript
// agentic-ai/src/orchestration/router.ts
routingTable.push({
  pattern: /mortgage|loan|interest rate|monthly payment/i,
  agentId: "<agent-id>",
  confidence: 0.8,
});
```

### 6. Export

Ensure the agent prompt is exported from the prompts barrel:

```typescript
// agentic-ai/src/prompts/index.ts
export { AGENT_PROMPT as <AgentId>Prompt } from "./agents/<agent-id>.js";
```

### 7. Test

```bash
# Build
cd agentic-ai && npm run build

# Verify registration
node -e "
const { createRegistry } = require('./dist/orchestration/index.js');
const reg = createRegistry();
const agent = reg.findByCapability?.('financial');
console.log('Found:', agent?.id);
"

# Test routing
node -e "
const { classifyIntent } = require('./dist/orchestration/index.js');
const result = classifyIntent('What is the mortgage rate for 123 Main St?');
console.log('Route:', result.agentId, 'Confidence:', result.confidence);
"

# Run full tests
node --test tests/orchestration.test.mjs
```

## Checklist

- [ ] Agent has a unique ID and is registered in the registry
- [ ] System prompt includes `<grounding-rules>` to prevent fabrication
- [ ] MCP permissions are scoped to only the tools this agent needs
- [ ] Routing table has patterns that match this agent's domain
- [ ] Fallback agent is defined and exists in the registry
- [ ] Agent prompt is exported from the prompts barrel
- [ ] Unit tests pass after registration
