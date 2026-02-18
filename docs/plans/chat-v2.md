# Chat V2 Implementation Plan

This document adapts the AI-native implementation guide to our current codebase, identifying what exists, what needs to change, and how to get there.

---

## Table of Contents

1. [Current State Summary](#current-state-summary)
2. [Gap Analysis](#gap-analysis)
3. [Key Architectural Decisions](#key-architectural-decisions)
4. [Implementation Plan](#implementation-plan)
5. [Detailed Changes by Component](#detailed-changes-by-component)
6. [Migration Strategy](#migration-strategy)

---

## Current State Summary

### What We Have

| Component | Location | Status |
|-----------|----------|--------|
| Chat Provider | `apps/web/components/chat/chat.tsx` | Page-level, uses `useChat` from AI SDK |
| Chat Messages | `apps/web/components/chat/parts/chat-messages.tsx` | Working, supports multiple part types |
| Tool Display | `apps/web/components/chat/tools/` | `default-tool.tsx`, `load-skill-tool.tsx` |
| Agent Config | `apps/web/lib/ai/agents/` | Single agent (`general-agent`) |
| Skill System | `apps/web/lib/ai/skills/` | Working, load-on-demand pattern |
| Tool Registry | `apps/web/lib/ai/tools/registry.ts` | Server-side tools only |
| API Routes | `apps/web/server/routes/protected/chat.ts` | Basic CRUD + message streaming |
| DB Schema | `packages/db/src/schema/chat.ts` | `chats`, `messages` tables |
| Chat Page | `apps/web/app/(protected)/chat/[id]/` | Standalone chat only |

### Current Architecture

```
apps/web/app/(protected)/chat/[id]/page.tsx
└── Chat (provider, page-level)
    └── ChatMessages
        └── Message parts (text, reasoning, tool, tool-load-skill)
    └── PromptInput (from @workspace/ui)
```

### Current Chat Flow

1. User navigates to `/chat` → redirects to `/chat/{newChatId}`
2. Page fetches chat + messages from server
3. `Chat` component wraps `useChat` hook
4. Messages streamed via `/api/chat/messages`
5. Tool calls executed server-side via AI SDK

### What's Working Well

- **Skill-based tool loading**: Keeps context lean, AI loads skills as needed
- **Message persistence**: All chats saved to database
- **Streaming responses**: Uses AI SDK's `toUIMessageStreamResponse()`
- **Type-safe tools**: Zod schemas for all tool inputs/outputs
- **Message parts**: Supports text, reasoning, tool calls, attachments

---

## Gap Analysis

### Critical Gaps (Must Fix for V2)

| Gap | Current | Needed | Impact |
|-----|---------|--------|--------|
| **Layout-level chat** | Page-level only | Layout-level with sidebar | Chat state lost on navigation |
| **Entity binding** | No binding fields | `boundEntityType`, `boundEntityId` | Can't tie chats to workflows |
| **Page context** | Not passed | Route, view, page-specific context | AI doesn't know what user sees |
| **Client tool registry** | None | Registry + `useRegisterToolHandler` | Pages can't register form tools |
| **Multiple agents** | Single agent | Agent per page/workflow type | Same agent for all contexts |
| **Chat orchestration** | None | `ChatOrchestrator` component | No dynamic chat loading |

### Secondary Gaps (V2.1)

| Gap | Impact |
|-----|--------|
| No `AIQuickAction` component | Users must type in chat to get AI help |
| No AI-triggered UI actions | AI can only modify data, not navigate |
| No AI action audit log | Can't track/undo AI actions |
| No app documentation for AI | AI can't answer "how do I..." questions |

### What to Keep

- **Skill system**: Works well, keeps tokens low
- **Tool structure**: Server tools with Zod schemas
- **Message persistence**: Existing schema works (just extend)
- **Chat components**: Messages, parts, tool display components

### What to Simplify

- **Message part types**: Consider merging `tool` and `tool-load-skill` display
- **Tool groups**: Currently unused, remove or integrate

---

## Key Architectural Decisions

### Decision 1: Layout-Level Chat Provider

**Choice**: Move chat to protected layout level with sidebar

**Rationale**:
- Chat always available from any page
- Conversation state preserved across navigation
- Better UX for AI-native experience

**Trade-offs**:
- More complex tool handler registration
- Must handle stale closures carefully
- Agent switching needs orchestration

### Decision 2: Tool Handler Registration Pattern

**Choice**: useEffect-based with refs (Option A from analysis)

```typescript
// Pattern: useEffect with stable ref wrapper
function useRegisterToolHandler(name: string, handler: ToolHandler) {
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useLayoutEffect(() => {
    const stableHandler = (input) => handlerRef.current(input);
    registerHandler(name, stableHandler);
    return () => unregisterHandler(name);
  }, [name]);
}
```

**Rationale**:
- Most flexible for dynamic registration
- Handles stale closures properly
- Familiar pattern for React developers

### Decision 3: Entity Binding Strategy

**Choice**: Extend existing `chats` table with binding fields

```sql
ALTER TABLE chats ADD COLUMN bound_entity_type TEXT;
ALTER TABLE chats ADD COLUMN bound_entity_id TEXT;
CREATE INDEX idx_chats_entity ON chats(bound_entity_type, bound_entity_id);
```

**Chat Types**:
- **Standalone**: `bound_entity_type` is null, appears in history
- **Entity-bound**: Linked to workflow, accessible from that entity only

### Decision 4: Agent Configuration

**Choice**: Route-based defaults with page override

```typescript
// Route defaults
const routeAgentMap = {
  "/transaction-setup": "transaction-setup-agent",
  "/bdx-setup": "bdx-setup-agent",
  // default: "general-agent"
};

// Page can override via useChatPageConfig()
useChatPageConfig({ agentId: "custom-agent" });
```

### Decision 5: Context Passing

**Choice**: Context passed with each `sendMessage()` call, not at initialization

```typescript
// ChatInput builds context at send time
const context = {
  route: { path: pathname, params },
  ...pageContext,  // From useChatPageConfig
};
sendMessage(input, context);
```

**Rationale**:
- Context is always fresh (not stale from mount time)
- Form values, selections reflect current state

---

## Implementation Plan

### Phase 1: Foundation (Core Architecture)

**Goal**: Layout-level chat with basic orchestration

#### 1.1 New Components to Create

| Component | Location | Purpose |
|-----------|----------|---------|
| `ChatOrchestrator` | `components/chat/chat-orchestrator.tsx` | Manages chat loading/switching |
| `ChatConfigProvider` | `components/chat/chat-config-provider.tsx` | Page config context |
| `ToolHandlerRegistry` | `components/chat/tool-handler-registry.tsx` | Client tool registration |
| `ChatPanel` | `components/chat/chat-panel.tsx` | Sidebar chat UI |

#### 1.2 Database Changes

```typescript
// packages/db/src/schema/chat.ts - Add fields
boundEntityType: text("bound_entity_type"),
boundEntityId: text("bound_entity_id"),
agentId: text("agent_id").notNull().default("general-agent"),
status: text("status").notNull().default("active"),
```

#### 1.3 Service Functions

```typescript
// packages/db/src/services/chat.ts - Add functions
resolveChat(userId, options)  // Find or create chat
getChatForEntity(userId, entityType, entityId)
getStandaloneChats(userId)
```

#### 1.4 Layout Integration

```typescript
// apps/web/app/(protected)/layout.tsx
<ChatConfigProvider>
  <ChatOrchestrator>
    <AppLayoutResizable>
      <AppLayoutResizablePanelPrimary>
        {children}
      </AppLayoutResizablePanelPrimary>
      <AppLayoutResizablePanelSecondary>
        <ChatPanel />
      </AppLayoutResizablePanelSecondary>
    </AppLayoutResizable>
  </ChatOrchestrator>
</ChatConfigProvider>
```

### Phase 2: Page Integration

**Goal**: Pages can configure chat and register tools

#### 2.1 Page Configuration Hook

```typescript
// Usage in any page
useChatPageConfig({
  agentId: "transaction-setup-agent",
  entityBinding: { type: "transaction-setup", id: setupId },
  context: { formValues: form.state.values },
});
```

#### 2.2 Tool Handler Registration

```typescript
// Register form tools in transaction setup page
useRegisterToolHandler("read-form-values", async (input) => {
  return form.state.values;
});

useRegisterToolHandler("update-form-values", async (input) => {
  for (const [field, value] of Object.entries(input.updates)) {
    form.setFieldValue(field, value);
  }
  return { success: true };
});
```

#### 2.3 Agent Definitions

Create agents for different contexts:

```typescript
// apps/web/lib/ai/agents/registry.ts
export const agents = {
  "general-agent": generalAgent,
  "transaction-setup-agent": transactionSetupAgent,
  "bdx-setup-agent": bdxSetupAgent,
};
```

### Phase 3: Chat History & Navigation

**Goal**: Multiple conversations, history UI

#### 3.1 Chat History API

```typescript
// GET /api/chats - List standalone chats
// GET /api/chat/:chatId - Get specific chat
// POST /api/chat/resolve - Find or create chat
// DELETE /api/chat/:chatId/messages - Clear messages
```

#### 3.2 Chat History Component

```typescript
// components/chat/chat-history.tsx
- New conversation button
- List of recent chats
- Switch between chats via URL param
```

#### 3.3 URL-Based Chat Switching

```
/dashboard                    → Default standalone chat
/dashboard?chatId=chat_123    → Specific standalone chat
/transaction-setup/setup_456  → Entity-bound chat (auto-resolved)
```

### Phase 4: Enhanced Features (V2.1)

**Goal**: AI-native experience throughout app

#### 4.1 AIQuickAction Component

```typescript
<AIQuickAction
  prompt="Explain this transaction"
  context={{ transactionId: tx.id }}
  label="Explain"
/>
```

#### 4.2 UI Action Tools

```typescript
// AI can navigate, filter, highlight
"navigate-to": navigateTo({ path: "/transactions/123" })
"set-filter": setFilters({ status: "pending" })
"highlight-items": highlightItems({ ids: ["tx_1", "tx_2"] })
```

#### 4.3 AI Action Audit Log

```typescript
// New table: ai_action_log
{
  id, userId, chatId, messageId,
  toolName, input, output, status,
  canUndo, undoAction, undoneAt,
  createdAt
}
```

---

## Detailed Changes by Component

### 1. ChatOrchestrator (New)

```typescript
// apps/web/components/chat/chat-orchestrator.tsx

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Chat } from "./chat";
import { ToolHandlerRegistry } from "./tool-handler-registry";
import { useChatConfig } from "./chat-config-provider";

export function ChatOrchestrator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { agentId, entityBinding } = useChatConfig();

  // Determine which chat to load
  const chatIdentifier = useMemo(() => {
    if (entityBinding) {
      return {
        type: "entity-bound" as const,
        entityType: entityBinding.type,
        entityId: entityBinding.id,
      };
    }
    const chatIdParam = searchParams.get("chatId");
    return {
      type: "standalone" as const,
      chatId: chatIdParam || undefined,
    };
  }, [entityBinding, searchParams]);

  // Fetch or create chat
  const { data: chatData, isLoading } = useQuery({
    queryKey: ["chat", "resolve", chatIdentifier],
    queryFn: () => resolveChat(chatIdentifier),
  });

  const chatKey = chatData?.chatId || "loading";

  return (
    <Chat
      key={chatKey}
      chatId={chatData?.chatId}
      agentId={agentId}
      initialMessages={chatData?.messages || []}
    >
      <ToolHandlerRegistry>
        {children}
      </ToolHandlerRegistry>
    </Chat>
  );
}
```

### 2. ChatConfigProvider (New)

```typescript
// apps/web/components/chat/chat-config-provider.tsx

"use client";

import { createContext, useContext, useState, useLayoutEffect, useMemo } from "react";

interface EntityBinding {
  type: string;
  id: string;
}

interface ChatConfig {
  agentId: string;
  entityBinding: EntityBinding | null;
  pageContext: Record<string, unknown>;
}

const DEFAULT_AGENT = "general-agent";

const ChatConfigContext = createContext<ChatConfig & {
  setAgentId: (id: string) => void;
  setEntityBinding: (binding: EntityBinding | null) => void;
  setPageContext: (context: Record<string, unknown>) => void;
} | null>(null);

export function useChatConfig() {
  const context = useContext(ChatConfigContext);
  if (!context) {
    return {
      agentId: DEFAULT_AGENT,
      entityBinding: null,
      pageContext: {},
    };
  }
  return context;
}

export function ChatConfigProvider({ children }: { children: React.ReactNode }) {
  const [agentId, setAgentId] = useState(DEFAULT_AGENT);
  const [entityBinding, setEntityBinding] = useState<EntityBinding | null>(null);
  const [pageContext, setPageContext] = useState<Record<string, unknown>>({});

  const value = useMemo(() => ({
    agentId,
    entityBinding,
    pageContext,
    setAgentId,
    setEntityBinding,
    setPageContext,
  }), [agentId, entityBinding, pageContext]);

  return (
    <ChatConfigContext.Provider value={value}>
      {children}
    </ChatConfigContext.Provider>
  );
}

// Convenience hook for pages
export function useChatPageConfig(config: {
  agentId?: string;
  entityBinding?: EntityBinding;
  context?: Record<string, unknown>;
}) {
  const { setAgentId, setEntityBinding, setPageContext } = useChatConfig() as any;

  useLayoutEffect(() => {
    if (config.agentId) setAgentId(config.agentId);
    if (config.entityBinding) setEntityBinding(config.entityBinding);
    if (config.context) setPageContext(config.context);

    return () => {
      setAgentId(DEFAULT_AGENT);
      setEntityBinding(null);
      setPageContext({});
    };
  }, [config.agentId, config.entityBinding, config.context]);
}
```

### 3. ToolHandlerRegistry (New)

```typescript
// apps/web/components/chat/tool-handler-registry.tsx

"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  useLayoutEffect,
  type MutableRefObject,
} from "react";

type ToolHandler = (input: unknown) => Promise<unknown>;
type ToolHandlerMap = Record<string, ToolHandler>;

interface ToolHandlerContextValue {
  handlers: MutableRefObject<ToolHandlerMap>;
  register: (name: string, handler: ToolHandler) => void;
  unregister: (name: string) => void;
}

const ToolHandlerContext = createContext<ToolHandlerContextValue | null>(null);

export function useToolHandlers() {
  const context = useContext(ToolHandlerContext);
  if (!context) {
    throw new Error("useToolHandlers must be used within ToolHandlerRegistry");
  }
  return context.handlers;
}

export function ToolHandlerRegistry({ children }: { children: React.ReactNode }) {
  const handlersRef = useRef<ToolHandlerMap>({});

  const register = useCallback((name: string, handler: ToolHandler) => {
    handlersRef.current[name] = handler;
  }, []);

  const unregister = useCallback((name: string) => {
    delete handlersRef.current[name];
  }, []);

  return (
    <ToolHandlerContext.Provider value={{ handlers: handlersRef, register, unregister }}>
      {children}
    </ToolHandlerContext.Provider>
  );
}

// Hook for pages to register handlers
export function useRegisterToolHandler(name: string, handler: ToolHandler) {
  const context = useContext(ToolHandlerContext);
  if (!context) {
    throw new Error("useRegisterToolHandler must be used within ToolHandlerRegistry");
  }

  const { register, unregister } = context;
  const handlerRef = useRef(handler);

  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useLayoutEffect(() => {
    const stableHandler: ToolHandler = (input) => handlerRef.current(input);
    register(name, stableHandler);
    return () => unregister(name);
  }, [name, register, unregister]);
}
```

### 4. Chat Provider Updates

```typescript
// apps/web/components/chat/chat.tsx - Key changes

// Add context parameter to sendMessage
const sendMessage = useCallback(
  (content: string, context: Record<string, unknown>) => {
    append(
      { role: "user", content },
      { body: { chatId, context } }
    );
  },
  [append, chatId]
);

// Handle client-side tool calls
const handleToolCall = useCallback(
  async ({ toolCall }: { toolCall: ToolCall }, addOutput: AddToolOutput) => {
    const handler = toolHandlers.current[toolCall.toolName];

    if (handler) {
      try {
        const result = await handler(toolCall.args);
        addOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: { success: true, data: result },
        });
      } catch (error) {
        addOutput({
          tool: toolCall.toolName,
          toolCallId: toolCall.toolCallId,
          output: { success: false, error: String(error) },
        });
      }
    }
    // Server-side tools handled by AI SDK
  },
  [toolHandlers]
);
```

### 5. Database Schema Updates

```typescript
// packages/db/src/schema/chat.ts

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title"),

    // NEW: Agent used for this chat
    agentId: text("agent_id").notNull().default("general-agent"),

    // NEW: Entity binding
    boundEntityType: text("bound_entity_type"),
    boundEntityId: text("bound_entity_id"),

    // NEW: Status
    status: text("status").notNull().default("active"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("chats_user_id_idx").on(table.userId),
    entityBindingIdx: index("chats_entity_binding_idx").on(
      table.boundEntityType,
      table.boundEntityId
    ),
  })
);
```

### 6. Chat Service Updates

```typescript
// packages/db/src/services/chat.ts - Add functions

export async function resolveChat(
  userId: string,
  options: {
    chatId?: string;
    entityType?: string;
    entityId?: string;
    agentId?: string;
  }
): Promise<{ chatId: string; isNew: boolean }> {
  // Entity-bound: find or create
  if (options.entityType && options.entityId) {
    const existing = await db.query.chats.findFirst({
      where: and(
        eq(chats.userId, userId),
        eq(chats.boundEntityType, options.entityType),
        eq(chats.boundEntityId, options.entityId)
      ),
    });

    if (existing) {
      return { chatId: existing.id, isNew: false };
    }
  }

  // Existing standalone
  if (options.chatId) {
    const existing = await db.query.chats.findFirst({
      where: and(eq(chats.id, options.chatId), eq(chats.userId, userId)),
    });

    if (existing) {
      return { chatId: existing.id, isNew: false };
    }
  }

  // Create new
  const newChatId = createId("chat");
  await db.insert(chats).values({
    id: newChatId,
    userId,
    agentId: options.agentId || "general-agent",
    boundEntityType: options.entityType || null,
    boundEntityId: options.entityId || null,
    status: "active",
  });

  return { chatId: newChatId, isNew: true };
}

export async function getStandaloneChats(userId: string) {
  return db.query.chats.findMany({
    where: and(
      eq(chats.userId, userId),
      isNull(chats.boundEntityType)
    ),
    orderBy: (chats, { desc }) => [desc(chats.updatedAt)],
  });
}
```

### 7. API Route Updates

```typescript
// apps/web/server/routes/protected/chat.ts - Add resolve endpoint

// POST /chat/resolve
.post(
  "/resolve",
  zValidator("json", z.object({
    type: z.enum(["standalone", "entity-bound"]),
    chatId: z.string().optional(),
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    agentId: z.string().optional(),
  })),
  async (c) => {
    const userId = c.get("userId");
    const body = c.req.valid("json");

    const result = await resolveChat(userId, {
      chatId: body.chatId,
      entityType: body.entityType,
      entityId: body.entityId,
      agentId: body.agentId,
    });

    const messages = result.isNew
      ? []
      : await getChatMessages(userId, result.chatId);

    return c.json({
      chatId: result.chatId,
      messages,
      isNew: result.isNew,
    });
  }
)
```

---

## Migration Strategy

### Step 1: Database Migration

```sql
-- Add new columns
ALTER TABLE chats ADD COLUMN agent_id TEXT NOT NULL DEFAULT 'general-agent';
ALTER TABLE chats ADD COLUMN bound_entity_type TEXT;
ALTER TABLE chats ADD COLUMN bound_entity_id TEXT;
ALTER TABLE chats ADD COLUMN status TEXT NOT NULL DEFAULT 'active';

-- Add index
CREATE INDEX idx_chats_entity_binding ON chats(bound_entity_type, bound_entity_id);
```

### Step 2: Create New Components (Parallel)

1. Create `ChatConfigProvider` (independent)
2. Create `ToolHandlerRegistry` (independent)
3. Create `ChatOrchestrator` (depends on above)
4. Create `ChatPanel` (reuses existing chat parts)

### Step 3: Update Layout

1. Wrap protected layout with new providers
2. Add resizable panels with chat sidebar
3. Keep existing `/chat/[id]` page working during transition

### Step 4: Migrate Pages

1. Add `useChatPageConfig()` to pages needing custom agents
2. Add `useRegisterToolHandler()` for client tools
3. Remove page-level `Chat` components

### Step 5: Update API Routes

1. Add `/chat/resolve` endpoint
2. Update `/chat/messages` to accept context in body
3. Keep existing endpoints for backwards compatibility

### Step 6: Cleanup

1. Remove old page-level chat patterns
2. Update imports across codebase
3. Remove unused components

---

## File Structure (Target)

```
apps/web/
├── app/(protected)/
│   ├── layout.tsx                    # ChatOrchestrator, ChatPanel
│   ├── chat/
│   │   └── [id]/page.tsx            # Legacy standalone chat page (optional)
│   ├── transaction-setup/
│   │   └── [id]/page.tsx            # Uses useChatPageConfig, registers tools
│   └── bdx-setup/
│       └── page.tsx                  # Uses useChatPageConfig, registers tools
│
├── components/chat/
│   ├── chat.tsx                      # Chat provider (updated)
│   ├── chat-orchestrator.tsx         # NEW: Chat loading/switching
│   ├── chat-config-provider.tsx      # NEW: Page config context
│   ├── tool-handler-registry.tsx     # NEW: Client tool registration
│   ├── chat-panel.tsx                # NEW: Sidebar chat UI
│   ├── chat-history.tsx              # Chat history list
│   ├── parts/
│   │   ├── chat-messages.tsx         # Message list (existing)
│   │   ├── chat-input.tsx            # Input with context (updated)
│   │   ├── chat-header.tsx           # Header with actions
│   │   └── message.tsx               # Single message
│   └── tools/
│       ├── default-tool.tsx          # Tool display (existing)
│       └── load-skill-tool.tsx       # Skill display (existing)
│
├── lib/ai/
│   ├── agents/
│   │   ├── registry.ts               # Agent registry (expanded)
│   │   ├── general-agent.ts          # General agent (existing)
│   │   ├── transaction-setup-agent.ts # NEW
│   │   └── bdx-setup-agent.ts        # NEW
│   ├── tools/
│   │   ├── registry.ts               # Server tools (existing)
│   │   └── client/                   # NEW: Client tool schemas
│   │       ├── form-tools.ts
│   │       └── sheet-tools.ts
│   └── skills/
│       └── registry/                 # Skills (existing)
│
└── server/routes/protected/
    └── chat.ts                       # API routes (updated)

packages/db/src/
├── schema/
│   └── chat.ts                       # Schema (updated)
└── services/
    └── chat.ts                       # Services (updated)
```

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Chat visible in sidebar on all protected pages
- [ ] Chat state preserved when navigating between pages
- [ ] Entity-bound chats created and loaded correctly
- [ ] Pages can configure agent via `useChatPageConfig()`

### Phase 2 Complete When:
- [ ] Transaction setup page registers form tools
- [ ] AI can read/update form values via client tools
- [ ] BDX setup page registers sheet tools (if applicable)

### Phase 3 Complete When:
- [ ] Chat history shows standalone chats
- [ ] Users can switch between chats
- [ ] New chat creation works from sidebar

### V2.1 Complete When:
- [ ] `AIQuickAction` components deployed in key locations
- [ ] AI can trigger navigation and filter actions
- [ ] AI action audit log captures tool executions

---

## Open Questions

1. **Chat panel default state**: Open or closed by default?
2. **Agent switching animation**: Show loading state when switching agents?
3. **Skill preservation**: When switching chats, preserve loaded skills?
4. **Message streaming interruption**: What happens if user navigates mid-stream?
5. **Mobile responsive**: How does sidebar chat work on mobile?

---

## References

- [AI-Native Implementation Guide](./ai-native-implementation-guide.md)
- [AI-Native Analysis](./ai-native-analysis.md)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
