# Agent Harness Testing Plan

## Context

The agent harness covers everything surrounding the AI agent: message handling, file processing, tool calls, skill loading, and persistence. We want to test as much of this as possible without relying on actual AI model calls.

## Testing Layers (ordered by priority)

### 1. Skill Service — Pure Functions

**File:** `src/lib/ai/skills/skill-service.ts`

8 pure functions with zero external dependencies. These control which tools the agent can call and when — bugs here mean the agent silently loses capabilities.

**Functions to test:**

- `buildInitialActiveTools(agent, messages)` — verifies correct tools are active at conversation start (should always include `load-skill` + `show-message` + default loaded + historically loaded)
- `handleSkillToolResults(toolResults, activeTools)` — verifies tools get activated when `load-skill` completes successfully
- `getToolsFromLoadedSkillsInMessages(messages)` — verifies message history is parsed to restore previously loaded skills across agent steps
- `formatSkillsForPrompt(availableSkills)` — verifies markdown formatting for system prompt
- `getSkillDefinition(name)` — verifies skill registry lookup (valid + invalid names)
- `listSkillsForAgent(availableSkills)` — verifies filtering to agent-specific skills
- `listSkillsMetadata()` — verifies all registered skills are returned
- `getToolsFromDefaultSkills(agent)` — verifies default skill tool extraction

**Test file:** `test/services/skill-service.test.ts`

### 2. Tool Execute Functions — DB Integration

**Files:**
- `src/lib/ai/tools/products.ts`
- `src/lib/ai/tools/warehouses.ts`
- `src/lib/ai/tools/load-skill.ts`

Use existing Cloudflare vitest setup with D1 migrations. Each tool's `execute` function calls core DB functions that are already exercised by service tests.

**What to test:**
- Input validation via zod schemas (invalid inputs rejected)
- Success output format: `{ success: true, data: ... }`
- Error output format: `{ success: false, error: "..." }`
- User isolation (tools receive `userId` — verify data scoping)
- `needsApproval` flag set on mutation tools (create, update, delete)
- `load-skill` tool returns correct skill definition and available tools list
- `load-skill` tool returns error for unknown skill names

**Test file:** `test/services/tools.test.ts`

### 3. System Prompt Generation — Snapshot Tests

**File:** `src/lib/ai/agents/general-agent.ts`

`generalAgent.systemPrompt(context, availableSkills)` is pure. Snapshot test to catch unintended prompt regressions.

**What to test:**
- Prompt includes identity section
- Prompt includes skill protocol
- Available skills are formatted and included
- Context is JSON-stringified and appended
- Prompt changes are caught by snapshot diff

**Test file:** `test/services/agent-config.test.ts`

### 4. Chat API Route — Integration with Mocked Agent

**File:** `src/hono/org-protected/chat.ts`

Test the harness logic around the agent call using `SELF.fetch()` with `agentRespond` mocked.

**What to test:**
- Chat creation on first message (new chatId → creates chat + generates title)
- Message persistence (upsert called with correct structure)
- Message regeneration (trigger: "regenerate-message" → deletes from point, re-processes)
- Auth/org checks (401 without session, 403 without org)
- GET endpoints (list chats, get specific chat with messages)

**Test file:** `test/api/chat.test.ts`

### 5. Agent Respond — Integration with Mocked AI

**File:** `src/lib/ai/agents/agent-respond.ts`

This is the core orchestration function. Test with mocked `streamText` from AI SDK.

**What to test:**
- Correct model and system prompt are passed to `streamText`
- `activeTools` starts with the right set and updates via `prepareStep`
- `onFinish` callback persists the response message
- Message metadata includes timing, model ID, usage stats
- `stopWhen: stepCountIs(25)` is configured
- `sendReasoning: true` and `sendSources: true` are set

**Test file:** `test/services/agent-respond.test.ts`

## AI SDK Test Utilities

The AI SDK (`ai@6.0.39`) provides test helpers in `ai/test`:

### Imports

```ts
import { MockLanguageModelV3, MockProviderV3, mockId, mockValues } from "ai/test";
import { simulateReadableStream } from "ai";
```

### MockLanguageModelV3

Mock implementation of the language model interface. Supports both `doGenerate` (non-streaming) and `doStream` (streaming).

```ts
const mockModel = new MockLanguageModelV3({
  provider: "test-provider",
  modelId: "test-model",
  doGenerate: async () => ({
    content: [{ type: "text", text: "Hello, world!" }],
    finishReason: { unified: "stop", raw: undefined },
    usage: {
      inputTokens: { total: 10, noCache: 10 },
      outputTokens: { total: 20, text: 20 },
    },
    warnings: [],
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      initialDelayInMs: null,
      chunkDelayInMs: null,
      chunks: [
        { type: "text-start", id: "text-1" },
        { type: "text-delta", id: "text-1", delta: "Hello" },
        { type: "text-end", id: "text-1" },
        {
          type: "finish",
          finishReason: { unified: "stop", raw: undefined },
          usage: {
            inputTokens: { total: 10, noCache: 10 },
            outputTokens: { total: 20, text: 20 },
          },
        },
      ],
    }),
  }),
});
```

**Tracking calls:** The mock records all calls for assertions:
- `mockModel.doGenerateCalls` — array of all `doGenerate` call options
- `mockModel.doStreamCalls` — array of all `doStream` call options

**Multiple responses:** Pass an array to `doGenerate` or `doStream` for multi-step agents:
```ts
new MockLanguageModelV3({
  doStream: [firstResponse, secondResponse, thirdResponse],
});
```

### Stream Chunk Types for Tool Calls

To simulate tool calls in streaming, use these chunk types:

```ts
// Tool call stream chunks:
{ type: "tool-input-start", id: "call-1", toolName: "load-skill" }
{ type: "tool-input-delta", id: "call-1", delta: '{"name":"product-manager"}' }
{ type: "tool-input-end", id: "call-1" }

// Text stream chunks:
{ type: "text-start", id: "text-1" }
{ type: "text-delta", id: "text-1", delta: "Here is..." }
{ type: "text-end", id: "text-1" }

// Reasoning stream chunks:
{ type: "reasoning-start", id: "reasoning-1" }
{ type: "reasoning-delta", id: "reasoning-1", delta: "Let me think..." }
{ type: "reasoning-end", id: "reasoning-1" }

// Finish:
{ type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: { ... } }
```

### MockProviderV3

Mocks the gateway/provider to return specific models by ID:

```ts
const mockProvider = new MockProviderV3({
  languageModels: {
    "google/gemini-3-flash": mockModel,
  },
});
```

### Helper Functions

- `mockId()` — returns incrementing integer IDs (`"0"`, `"1"`, `"2"`, ...)
- `mockValues(a, b, c)` — returns a function that cycles through values on each call

### simulateReadableStream

Creates a `ReadableStream` that emits chunks with configurable delays:

```ts
import { simulateReadableStream } from "ai";

const stream = simulateReadableStream({
  chunks: [chunk1, chunk2, chunk3],
  initialDelayInMs: null, // null = no delay (fast tests)
  chunkDelayInMs: null,
});
```

### Example: Testing streamText with Tool Calls

```ts
import { streamText } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { simulateReadableStream } from "ai";

const model = new MockLanguageModelV3({
  doStream: async () => ({
    stream: simulateReadableStream({
      initialDelayInMs: null,
      chunkDelayInMs: null,
      chunks: [
        // Agent calls load-skill tool
        { type: "tool-input-start", id: "call-1", toolName: "load-skill" },
        { type: "tool-input-delta", id: "call-1", delta: '{"name":"product-manager"}' },
        { type: "tool-input-end", id: "call-1" },
        { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: { inputTokens: { total: 10, noCache: 10 }, outputTokens: { total: 5, text: 0 } } },
      ],
    }),
  }),
});

const result = streamText({
  model,
  prompt: "List all products",
  tools: { /* ... */ },
});
```

### Example: Multi-Step Agent (Tool Call → Response)

```ts
const model = new MockLanguageModelV3({
  doStream: [
    // Step 1: Agent calls a tool
    async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: null,
        chunkDelayInMs: null,
        chunks: [
          { type: "tool-input-start", id: "call-1", toolName: "list-products" },
          { type: "tool-input-delta", id: "call-1", delta: "{}" },
          { type: "tool-input-end", id: "call-1" },
          { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage: { inputTokens: { total: 10, noCache: 10 }, outputTokens: { total: 5, text: 0 } } },
        ],
      }),
    }),
    // Step 2: Agent responds with text after seeing tool result
    async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: null,
        chunkDelayInMs: null,
        chunks: [
          { type: "text-start", id: "text-1" },
          { type: "text-delta", id: "text-1", delta: "Here are your products: ..." },
          { type: "text-end", id: "text-1" },
          { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage: { inputTokens: { total: 20, noCache: 20 }, outputTokens: { total: 15, text: 15 } } },
        ],
      }),
    }),
  ],
});
```

## What to Skip (for now)

- **Actual AI model responses** — non-deterministic, slow, expensive
- **E2E chat tests via Playwright** — streaming UI is hard to assert reliably
- **Title generation** — thin `generateText` wrapper, low risk
- **Client-side tool handlers** — React component territory, different test strategy

## Known Issues to Fix

- **`form-manager` skill** is listed in `general-agent.ts` `availableCalled` but has no skill definition — agent gets error if it tries to load it
- **`show-message` tool** has no `execute` body (handled client-side, but should be documented or have a no-op execute)

## Test Infrastructure

- **Framework:** Vitest with `@cloudflare/vitest-pool-workers`
- **DB:** D1 with Drizzle migrations applied per test
- **API testing:** `SELF.fetch()` for Hono route tests
- **Helpers:** `test/helpers/seed.ts` (seedUser, seedOrganization, etc.), `test/helpers/auth.ts` (createTestSession)
