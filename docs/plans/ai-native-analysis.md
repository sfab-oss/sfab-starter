# AI-Native Application Analysis

## Executive Summary

This document analyzes the Keystone project's readiness to be a truly AI-native inventory management application. It covers:

1. What "AI-native" means for this application
2. Current implementation strengths
3. What's missing to achieve AI-native status
4. What might be over-engineered or unnecessary
5. Chat architecture deep-dive (the primary AI interface)

---

## What Does "AI-Native" Mean?

An AI-native application is fundamentally different from an application with AI bolted on. Key characteristics:

### 1. AI Has Full Capability Parity

Everything the user can do through the UI, the AI can do through tools:
- CRUD operations on all entities
- Navigation and filtering
- Complex workflows
- Settings and preferences

### 2. AI Is Contextually Aware

The AI always knows:
- What the user is looking at (current page, selected items)
- What actions are available
- The user's recent activity and patterns
- Domain-specific context (e.g., this is an insurance inventory system)

### 3. AI Is Embedded, Not Attached

- AI isn't just in a chat sidebar—it's woven into the experience
- Quick actions, suggestions, explanations appear contextually
- The line between "using the app" and "talking to the AI" is blurred

### 4. AI Can Be Proactive

- AI notices patterns and offers suggestions
- AI warns about potential issues
- AI can automate repetitive tasks the user does often

### 5. Seamless Human-AI Collaboration

- User can start a task, AI can continue it
- AI actions can be reviewed, modified, undone
- Clear indication of what the AI did vs what the user did

---

## Current State Assessment

### What's Working Well

| Aspect | Implementation | Assessment |
| ------ | -------------- | ---------- |
| Shared Services | UI and AI use same service layer | Excellent - ensures capability parity |
| Tool Definitions | Typed tools with Zod schemas | Good - type-safe AI actions |
| Client-Side Tools | Form manipulation via `onToolCall` | Good pattern - AI can interact with UI state |
| Skill System | Dynamic tool loading | Interesting - keeps token usage low |
| Chat Composability | Reusable chat components | Good - flexible placement |
| Message Persistence | Stored in database | Good - conversation history preserved |

### What's Missing

#### High Priority - Core AI-Native Gaps

**1. No Page/View Context to AI**

The AI doesn't know what the user is looking at.

```typescript
// Current: AI gets generic context or nothing
sendMessage({ role: "user", content: "Help me with this" });

// Needed: AI knows current view
sendMessage({
  role: "user",
  content: "Help me with this",
  context: {
    currentPage: "/transactions",
    selectedItems: ["tx_123", "tx_456"],
    currentFilters: { status: "pending" },
    visibleData: [/* summary of what's on screen */],
  }
});
```

**Impact**: AI can't give contextual help. User has to explain what they're looking at.

**2. No AI-Triggered UI Actions**

AI can modify data but can't control the UI.

```typescript
// Current: AI can update database
await updateTransaction(id, { status: "approved" });

// Missing: AI can navigate, filter, highlight
navigateTo("/transactions/" + id);
setFilter({ status: "pending" });
highlightRows(["tx_123", "tx_456"]);
openModal("confirmation");
```

**Impact**: AI can tell user "I updated the transaction" but can't show them. User has to navigate manually.

**3. No Proactive AI**

AI only responds when user sends a message.

```typescript
// Missing: AI notices patterns
onUserAction("filter-transactions-by-pending-3-times-today", () => {
  suggestToUser("I notice you check pending transactions often. Want me to notify you when new ones arrive?");
});

// Missing: AI warns about issues
onDataChange("transaction-amount-unusually-high", (tx) => {
  showAINotification(`Transaction ${tx.id} has an unusually high amount. Want me to review it?`);
});
```

**Impact**: User has to remember to ask AI for help. AI can't prevent issues proactively.

**4. No AI Action History/Audit**

Can't see what the AI did across conversations.

```typescript
// Missing: Track AI actions
interface AIActionLog {
  id: string;
  timestamp: Date;
  action: string;        // "update-transaction"
  input: object;         // What AI was asked to do
  result: object;        // What happened
  chatId: string;        // Which conversation
  canUndo: boolean;      // Can this be reversed
}
```

**Impact**: User can't review or undo AI actions. No accountability.

**5. No Contextual AI Entry Points**

AI only accessible via chat sidebar.

```typescript
// Missing: AI buttons throughout UI
<TransactionRow>
  <AIQuickAction
    prompt="Explain this transaction"
    context={{ transactionId: tx.id }}
  />
  <AIQuickAction
    prompt="Find similar transactions"
    context={{ transactionId: tx.id }}
  />
</TransactionRow>

// Missing: AI-powered search
<AISearchBar
  placeholder="Find transactions..."
  mode="natural-language" // "all transactions over $10k from last month"
/>
```

**Impact**: User has to context-switch to chat, explain what they're looking at.

**6. No Application Documentation for AI**

AI doesn't have knowledge about the app itself - what features exist, what each page does, how to accomplish tasks.

```typescript
// Missing: App documentation that AI can reference
interface AppDocumentation {
  routes: {
    path: string;
    name: string;
    description: string;
    features: string[];
    howTo: string[];        // Step-by-step guides
    relatedRoutes: string[];
  }[];
  features: {
    name: string;
    description: string;
    howTo: string;          // Step-by-step guide
    relatedTools: string[]; // AI tools for this feature
  }[];
  glossary: {
    term: string;
    definition: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
}
```

**Dual-Purpose Documentation** - Same docs serve AI and users:

```typescript
// 1. AI references it to guide users
// User: "How do I bulk import transactions?"
// AI: (references docs) "You can use the BDX Setup feature.
//      Go to /bdx-setup, upload your Excel file, and I'll help
//      you map the columns."

// 2. Users browse directly in Help section
<HelpPage>
  <SearchableDocumentation docs={appDocs} />
</HelpPage>

// 3. Contextual help buttons in UI
<PageHeader title="Transactions">
  <HelpButton topic="transactions" />
</PageHeader>
```

**Implementation Options:**

| Option | Approach | Pros | Cons |
| ------ | -------- | ---- | ---- |
| Markdown files | `/docs/app/routes/*.md` | Easy to write, version controlled | Separate from code, can drift |
| Structured data | `appDocumentation.ts` | Type-safe, co-located | More verbose to write |
| Code metadata | Pages export `pageDoc` | Always in sync with code | Scattered across codebase |
| Hybrid | Structured index + markdown content | Best of both | More complex setup |

**Impact**: AI can't answer "how do I..." questions about the app. Users have to figure things out themselves or ask about features AI doesn't know exist.

#### Medium Priority - Enhanced Experience

**7. No Multi-Turn Task Flows**

AI handles single requests but can't guide multi-step workflows well.

```typescript
// Current: User asks, AI responds
// Missing: AI guides through complex process

interface TaskFlow {
  id: string;
  type: "transaction-review" | "bulk-update" | "report-generation";
  steps: TaskStep[];
  currentStep: number;
  context: object;
}

// AI: "I'll help you review these 15 transactions. Let's go through them one by one."
// AI: "Transaction 1 of 15: $5,000 from ABC Corp. Approve, reject, or skip?"
// User: "Approve"
// AI: "Approved. Transaction 2 of 15: ..."
```

**8. No AI Explanation of Data**

AI can fetch data but doesn't explain what it means.

```typescript
// Current tool response
return { transactions: [...], total: 150 };

// Enhanced: AI provides insight
return {
  transactions: [...],
  total: 150,
  insights: [
    "This is 20% higher than last month",
    "3 transactions are flagged for review",
    "The largest is $50,000 from XYZ Corp"
  ]
};
```

**9. No Learning from User Preferences**

AI doesn't remember user patterns.

```typescript
// Missing: User preference learning
interface UserAIPreferences {
  preferredFilters: Record<string, FilterPreset>;
  commonQuestions: string[];
  responseStyle: "brief" | "detailed";
  autoApprovalRules: ApprovalRule[];
}
```

### What Might Be Over-Engineered

**1. Skill System - Possibly Premature**

The `load-skill` pattern is interesting for keeping token counts low, but:

- Adds latency (AI must load skill before using tools)
- Extra complexity in tool activation logic
- May not be needed if token limits aren't a real problem

**Consider**: Start with all tools available, add skill gating later if token usage is actually problematic.

**Alternative**: Use agent-level tool sets instead of dynamic skill loading.

```typescript
// Simpler: Agent has fixed tools
const agents = {
  "korra-agent": {
    tools: ["list-transactions", "update-transaction", ...],
  },
  "transaction-setup": {
    tools: ["read-form", "update-form", "submit-form"],
  },
};

// vs Current: Dynamic skill loading
// load-skill → activates tools → now can use them
```

**2. Approval System - Not Currently Used**

The codebase has approval infrastructure but it's not clear if it's being used:

```typescript
// Tools can require approval, but is this actually needed?
requiresApproval: string[];
```

**Consider**: Remove until there's a clear use case. Add back when needed.

**3. Complex Message Part Types**

Multiple message part types (text, reasoning, tool, tool-load-skill) might be more than needed:

```typescript
// Is this complexity justified?
type MessagePart =
  | { type: "text"; content: string }
  | { type: "reasoning"; content: string }
  | { type: "tool"; tool: string; input: object; output: object }
  | { type: "tool-load-skill"; ... };
```

**Consider**: If reasoning is always shown the same as text, merge them. If tool-load-skill is just a tool variant, treat it as such.

### What's the Right Amount of AI?

There's a balance to strike:

**Too Little AI:**
- Chat sidebar only
- AI can answer questions but not take actions
- User does all the work, AI just advises

**Just Right (Target):**
- AI available everywhere but not intrusive
- AI can take actions with appropriate oversight
- AI enhances speed without removing control
- Clear when AI acted vs when user acted

**Too Much AI:**
- AI makes decisions without user input
- User feels out of control
- AI errors have big consequences
- Hard to understand what's happening

---

## Chat Architecture Deep-Dive

The following sections analyze the chat system, which is currently the primary AI interface.

### Core Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Chat Provider | `src/components/chat/chat.tsx` | React context-based chat state management |
| Chat API Routes | `src/hono/routes/protected/chat.ts` | Message handling and agent routing |
| Agent Response | `src/lib/ai/agents/agent-respond.ts` | AI response generation with tool execution |
| Skills Registry | `src/lib/ai/skills/registry/index.ts` | Skill definitions and tool mappings |
| Chat Service | `src/db/services/chat.ts` | Database operations for chat persistence |

### Chat Contexts Currently Implemented

1. **Main Chat** (`/chat/[id]`) - Standalone, skill-based, general purpose
2. **Transaction Setup Chat** - Entity-bound (to transaction setup), form-integrated, client-side tools
3. **BDX Setup Chat** - Entity-bound (to BDX session), Excel-integrated (partially implemented)
4. **Sidebar Panel Chat** - Composable, can be standalone or entity-bound

**Important Clarification**: All chats should be persisted to the database. The distinction is not "ephemeral vs persistent" but rather:
- **Standalone Chats**: Independent conversations with their own identity
- **Entity-Bound Chats**: Conversations tied to another entity (transaction setup, BDX session, etc.)

---

## Identified Patterns

### Pattern 1: Persistent Chat with History

**Use Case**: Main chat, general conversations that users want to reference later

**Characteristics**:
- Chat ID stored in database
- Messages persisted to `chats` and `messages` tables
- Appears in chat history list
- Uses URL-based routing (`/chat/{chatId}`)

**Current Implementation**:
```
/chat/[id]/page.tsx → Chat → agentRespond → Database persistence
```

### Pattern 2: Entity-Bound Chat

**Use Case**: Transaction setup, BDX setup, guided workflows

**Characteristics**:
- Chat ID derived from or linked to parent entity (e.g., `transactionSetupId`)
- Persisted to database with reference to parent entity
- Tied to a specific workflow or data context
- Can be resumed when returning to that entity

**Current Implementation** (needs improvement):
```
TransactionSetupPage → useMemo(createId) → Chat (currently not linked to entity)
```

**Desired Implementation**:
```
TransactionSetupPage → getOrCreateChatForEntity(transactionSetupId) → Chat (persisted, linked)
```

### Pattern 3: Client-Side Tool Execution

**Use Case**: Tools that need access to React state (forms, UI components)

**Characteristics**:
- Tool defined server-side with schema only
- Execution happens client-side via `onToolCall` callback
- Results sent back via `addToolOutput`

**Current Implementation**:
```typescript
onToolCall={async ({ toolCall }, addToolOutput) => {
  // Access React state
  // Execute tool logic
  addToolOutput({ tool, toolCallId, output });
}}
```

### Pattern 4: Server-Side Tool Execution

**Use Case**: Tools that access databases, APIs, or require secrets

**Characteristics**:
- Full tool definition with `execute` function
- Runs in API route context
- Has access to `userId` and services

**Current Implementation**:
```typescript
tool({
  execute: async (input) => await serviceFunction(userId, input)
})
```

### Pattern 5: Skill-Based Tool Discovery

**Use Case**: Gradual capability revelation, keeping token usage low

**Characteristics**:
- Base agent has limited tools
- `load-skill` tool activates additional tools
- Skills bundle related tools with instructions

**Current Implementation**:
```
User asks about transactions → AI loads "transaction-manager" skill → Transaction tools become active
```

---

## Critical Challenge: Chat Provider Placement

The `useChat` hook from `@ai-sdk/react` provides two key APIs for client-side tool execution:
- `onToolCall`: Callback invoked when AI calls a tool
- `addToolOutput`: Function to send tool results back to the AI

**The Problem**: These APIs are only available within the `Chat` provider's React tree. This creates a fundamental tension:

### Option A: Chat Provider at Layout Level

```
ProtectedLayout
└── Chat (provider here)
    └── ResizablePanels
        ├── PrimaryPanel
        │   └── PageContent (needs addToolOutput for form tools)
        └── SecondaryPanel
            └── ChatUI
```

**Pros**:
- Single chat instance across all pages
- Chat state preserved during navigation
- Consistent sidebar experience

**Cons**:
- Page components need to access `addToolOutput` from layout-level context
- Must expose tool handlers through additional context/props
- Form state and chat state are in different React trees

### Option B: Chat Provider at Page Level

```
ProtectedLayout
└── Page
    └── Chat (provider here)
        └── ResizablePanels
            ├── PrimaryPanel
            │   └── FormContent (easy access to addToolOutput)
            └── SecondaryPanel
                └── ChatUI
```

**Pros**:
- Easy access to `addToolOutput` within page
- Form and chat in same React tree
- Natural composition

**Cons**:
- Chat state lost on navigation
- Each page needs its own chat setup
- **Incompatible with layout-level sidebar**

### The Incompatibility Issue

**Pattern A and B cannot coexist**. If you have a chat in the protected layout AND a page tries to create its own chat, you get nested chats. The layout wraps all pages, so:

```
ProtectedLayout (with Chat A)
└── TransactionSetupPage (with Chat B)  ← PROBLEM: Nested chats!
```

### Possible Solutions

**Solution 1: Always Layout-Level with Tool Handler Registry**

Keep `Chat` at layout level but create a mechanism for pages to register their client-side tool handlers:

```typescript
// Layout level
<Chat onToolCall={handleToolCall}>
  <ClientToolHandlerRegistry>
    {children}
  </ClientToolHandlerRegistry>
</Chat>

// Page level
function TransactionSetupPage() {
  const { registerToolHandler } = useClientToolHandlers();

  useEffect(() => {
    registerToolHandler("read-form-values", async (input) => {
      return getFormValues(input.fields);
    });
    return () => unregisterToolHandler("read-form-values");
  }, []);
}
```

**Solution 2: Layout-Level Chat with Page-Level Tool Context**

Chat stays at layout, but pages can provide tool execution context:

```typescript
// Layout level
<Chat>
  <PageToolContextProvider>
    {children}
  </PageToolContextProvider>
</Chat>

// Page level - provides form ref to tool context
<ToolContextInjector formRef={formRef} sheetRef={sheetRef}>
  <TransactionSetupForm />
</ToolContextInjector>
```

**Solution 3: Conditional Chat Placement**

Layout provides chat ONLY for pages that don't define their own:

```typescript
// Layout checks if page wants its own chat
<AppLayoutResizable>
  <AppLayoutResizablePanelPrimary>
    {children}
  </AppLayoutResizablePanelPrimary>
  {!pageDefinesOwnChat && (
    <AppLayoutResizablePanelSecondary>
      <GlobalSidebarChat />
    </AppLayoutResizablePanelSecondary>
  )}
</AppLayoutResizable>

// Page-level for transaction setup (no layout chat)
export const metadata = { definesOwnChat: true };
```

**Solution 4: Single Chat, Dynamic Agent/Context**

One chat at layout level, but agent and context change based on current page:

```typescript
// Layout level
const { agent, context, toolHandlers } = usePageChatConfig();

<Chat
  agentId={agent}
  onToolCall={(call, addOutput) => toolHandlers[call.toolName]?.(call, addOutput)}
>
  {children}
</Chat>

// Each page exports its chat config
// transactionSetupPage: agent="transaction-setup", toolHandlers={...}
// dashboardPage: agent="korra-agent", toolHandlers={}
```

### Summary

Each solution has trade-offs. The choice depends on:
- How important is chat state preservation across navigation?
- How complex are the client-side tool requirements?
- How different are agents across pages?

**Leaning towards layout-level** (Solutions 1 or 4) for an AI-native app, but this introduces complexity around tool handler registration and agent switching that needs careful consideration.

**Page-level might be simpler** for pages with complex client-side tools (like transaction setup with forms), but loses the "always available chat" experience.

This needs prototyping to validate assumptions.

---

## Data Loading and Message Management

When Chat is at layout level, we need to handle:
1. **Initial load**: How to get chat data on first render
2. **Navigation**: How to switch chats when route changes
3. **Message reset**: How to clear/load different messages for different contexts

### The Layout Persistence Problem

In Next.js App Router, **layouts don't re-render on navigation**. They persist across route changes. This means:

```
/transactions → /transaction-setup/123
     ↓                    ↓
  Layout (persists, doesn't re-run)
     ↓                    ↓
  Page A              Page B
```

So we **cannot** rely on server-side data fetching in the layout for chat data, because the layout only runs once.

### Approach: Client-Side Chat Orchestration

The Chat provider must be a **client component** that:
1. Watches for route/context changes
2. Determines which chat to load (standalone or entity-bound)
3. Fetches messages from API
4. Resets `useChat` state with new messages

```typescript
// Proposed: src/components/chat/chat-orchestrator.tsx

"use client";

function ChatOrchestrator({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { agentId, entityBinding, context } = useChatPageConfig();

  // Determine which chat to use based on current page config
  const chatIdentifier = useMemo(() => {
    if (entityBinding) {
      return { type: "entity-bound", entityType: entityBinding.type, entityId: entityBinding.id };
    }
    // For standalone, use a session-based or URL-based chat ID
    return { type: "standalone", chatId: searchParams.get("chatId") || "new" };
  }, [entityBinding, searchParams]);

  // Fetch or create chat based on identifier
  const { data: chatData, isLoading } = useQuery({
    queryKey: ["chat", chatIdentifier],
    queryFn: () => fetchOrCreateChat(chatIdentifier),
    enabled: !!chatIdentifier,
  });

  // Key forces useChat to reset when chat changes
  const chatKey = chatData?.id || "loading";

  return (
    <Chat
      key={chatKey}  // Forces reset when switching chats
      id={chatData?.id}
      agentId={agentId}
      initialMessages={chatData?.messages}
    >
      {children}
    </Chat>
  );
}
```

### Message Reset Strategies

**Strategy 1: Key-Based Reset**

React's `key` prop forces component remount. When chat ID changes, reset everything:

```typescript
<Chat key={chatId} id={chatId} initialMessages={messages}>
```

**Pros**: Simple, guaranteed clean state
**Cons**: Loses any UI state (scroll position, draft input)

**Strategy 2: Imperative Reset via useChat**

If `useChat` supports it, call a reset function:

```typescript
const { setMessages } = useChat();

useEffect(() => {
  setMessages(newMessages);
}, [chatId]);
```

**Pros**: More control, can preserve some UI state
**Cons**: Depends on `useChat` API supporting this

**Strategy 3: Two-Phase Load**

Show loading state while fetching, then render chat:

```typescript
if (isLoadingChat) {
  return <ChatLoadingSkeleton />;
}

return <Chat id={chatId} initialMessages={messages} />;
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PAGE NAVIGATION                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    useChatPageConfig()                          │
│  (Page registers: agentId, entityBinding, context)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ChatOrchestrator                             │
│  1. Detects config change                                       │
│  2. Determines chat identifier                                  │
│  3. Fetches chat data from API                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GET /api/chat/resolve                        │
│  Input: { entityType?, entityId?, chatId? }                     │
│  Output: { chatId, messages[], agentId }                        │
│  (Creates new chat if needed for entity binding)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Chat Component                               │
│  - Receives new key (forces reset)                              │
│  - Receives initialMessages                                     │
│  - Ready for new conversation                                   │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoint for Chat Resolution

```typescript
// GET /api/chat/resolve
// Resolves which chat to use and returns its data

interface ResolveRequest {
  // For entity-bound chats
  entityType?: "transaction-setup" | "bdx-setup";
  entityId?: string;
  // For standalone chats
  chatId?: string;
}

interface ResolveResponse {
  chatId: string;
  messages: Message[];
  isNew: boolean;  // true if chat was just created
}

// Implementation
async function resolveChat(userId: string, req: ResolveRequest): Promise<ResolveResponse> {
  if (req.entityType && req.entityId) {
    // Entity-bound: find or create
    const chat = await getChatForEntity(userId, req.entityType, req.entityId);
    const messages = await getChatMessages(userId, chat.id);
    return { chatId: chat.id, messages, isNew: messages.length === 0 };
  }

  if (req.chatId && req.chatId !== "new") {
    // Existing standalone chat
    const messages = await getChatMessages(userId, req.chatId);
    return { chatId: req.chatId, messages, isNew: false };
  }

  // New standalone chat
  const chat = await createChat(userId, { title: "New conversation" });
  return { chatId: chat.id, messages: [], isNew: true };
}
```

### When to Load vs When to Reset

| Scenario | Action |
| -------- | ------ |
| Initial page load | Fetch chat data, render with initialMessages |
| Navigate to same chat type | Keep current chat (no reset) |
| Navigate to different entity | Fetch new chat, reset with key change |
| Navigate from entity-bound to standalone | Fetch/create standalone, reset |
| User clicks "New Chat" | Create new chat, reset |
| User selects from history | Fetch existing chat, reset |

### Considerations

1. **Loading States**: Show skeleton while fetching chat data on navigation
2. **Optimistic Updates**: Could pre-fetch likely next chats
3. **Cache**: React Query caches chat data, fast switching for recently viewed
4. **Draft Preservation**: Unsent message in input - warn before switching?
5. **Streaming Interruption**: If AI is responding and user navigates, what happens?

---

## Tool Handler Registration Options

If we go with layout-level chat, pages need a way to register their client-side tool handlers. Two main approaches:

### Option A: useEffect-Based Registration

Pages use `useEffect` to imperatively register and unregister handlers.

```typescript
// Hook implementation
function useRegisterToolHandler(
  toolName: string,
  handler: ToolHandler,
  deps: DependencyList
) {
  const { registerHandler, unregisterHandler } = useToolHandlerRegistry();

  useEffect(() => {
    registerHandler(toolName, handler);
    return () => unregisterHandler(toolName);
  }, [toolName, ...deps]);
}

// Page usage
function TransactionSetupPage() {
  const form = useForm<TransactionFormData>();

  useRegisterToolHandler(
    "read-form-values",
    async (input) => {
      const values = form.getFieldValue(input.fields);
      return { values };
    },
    [form]  // Re-register if form instance changes
  );

  useRegisterToolHandler(
    "update-form-values",
    async (input) => {
      form.setFieldValue(input.field, input.value);
      return { success: true };
    },
    [form]
  );

  return <TransactionSetupForm form={form} />;
}
```

**Pros:**
- Flexible - can register handlers based on any condition
- Familiar pattern for React developers
- Can access any React state/refs in the handler
- Cleanup is automatic via useEffect cleanup

**Cons:**
- Order of registration can be unpredictable
- Handler function identity changes on re-renders (need stable refs)
- Race conditions if handler is called during registration/unregistration
- Need to be careful about stale closures

**Stale Closure Mitigation:**

```typescript
function useRegisterToolHandler(toolName: string, handler: ToolHandler) {
  const handlerRef = useRef(handler);

  // Always keep ref updated to latest handler
  useLayoutEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const stableHandler: ToolHandler = (input) => handlerRef.current(input);
    registerHandler(toolName, stableHandler);
    return () => unregisterHandler(toolName);
  }, [toolName]);
}
```

### Option B: Declarative Component-Based Registration

Use a component that declares tool handlers in the render tree.

```typescript
// Component implementation
function ToolHandler<T>({
  tool,
  handler,
}: {
  tool: string;
  handler: (input: T) => Promise<unknown>;
}) {
  const { registerHandler, unregisterHandler } = useToolHandlerRegistry();

  useEffect(() => {
    registerHandler(tool, handler);
    return () => unregisterHandler(tool);
  }, [tool, handler]);

  return null; // Renders nothing
}

// Page usage
function TransactionSetupPage() {
  const form = useForm<TransactionFormData>();

  const readFormHandler = useCallback(
    async (input: { fields: string[] }) => {
      return { values: form.getFieldValue(input.fields) };
    },
    [form]
  );

  const updateFormHandler = useCallback(
    async (input: { field: string; value: unknown }) => {
      form.setFieldValue(input.field, input.value);
      return { success: true };
    },
    [form]
  );

  return (
    <>
      <ToolHandler tool="read-form-values" handler={readFormHandler} />
      <ToolHandler tool="update-form-values" handler={updateFormHandler} />
      <TransactionSetupForm form={form} />
    </>
  );
}
```

**Pros:**
- Visible in component tree - easier to debug
- Registration tied to component lifecycle naturally
- Can be conditionally rendered
- Composable - can wrap in custom components

**Cons:**
- Still uses useEffect internally
- Requires useCallback for handler stability
- Adds components to the tree (minor overhead)
- Less flexible for dynamic tool registration

### Option C: Context-Based Injection

Pages provide handlers via a context that the chat reads from.

```typescript
// Context provider in page
function TransactionSetupPage() {
  const form = useForm<TransactionFormData>();

  const toolHandlers = useMemo(() => ({
    "read-form-values": async (input) => ({
      values: form.getFieldValue(input.fields)
    }),
    "update-form-values": async (input) => {
      form.setFieldValue(input.field, input.value);
      return { success: true };
    },
  }), [form]);

  return (
    <PageToolHandlersProvider handlers={toolHandlers}>
      <TransactionSetupForm form={form} />
    </PageToolHandlersProvider>
  );
}

// Chat reads from context
function ChatOrchestrator() {
  const pageHandlers = usePageToolHandlers(); // May be empty object

  const handleToolCall = useCallback(({ toolCall }, addToolOutput) => {
    const handler = pageHandlers[toolCall.toolName];
    if (handler) {
      handler(toolCall.args).then(output => {
        addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output });
      });
    }
  }, [pageHandlers]);

  return <Chat onToolCall={handleToolCall}>...</Chat>;
}
```

**Pros:**
- Clean separation - page provides, chat consumes
- No registration/unregistration logic
- Handlers automatically available when page mounts
- Easy to understand data flow

**Cons:**
- Context must bubble up through component tree
- If page doesn't provide context, need fallback
- Handlers must be memoized to prevent re-renders
- Less granular control over individual tools

### Comparison Matrix

| Aspect | useEffect (A) | Declarative (B) | Context (C) |
| ------ | ------------- | --------------- | ----------- |
| Flexibility | High | Medium | Medium |
| Debugging | Harder | Easier (visible) | Easier |
| Stale closures | Risk | Risk | Less risk |
| Boilerplate | Low | Medium | Low |
| Dynamic tools | Easy | Possible | Harder |
| Type safety | Good | Good | Good |

### Recommendation

**For simple cases**: Option C (Context) is cleanest - page just provides handlers, no registration dance.

**For complex cases**: Option A (useEffect) with proper ref handling gives most flexibility.

**Option B** is a middle ground but doesn't add much over A.

Could also **combine approaches**: Context as the default, with useEffect-based `useRegisterToolHandler` for edge cases.

---

## Agent Switching Options

Different pages may want different agents:
- Dashboard, Transactions list → General agent (`korra-agent`)
- Transaction Setup → Specialized agent (`transaction-setup`)
- BDX Setup → Specialized agent (`bdx-setup`)

How this works depends on where the chat lives.

### If Chat is at Page Level

Simple - each page creates its own Chat with its desired agent:

```typescript
// Dashboard page
<Chat agentId="korra-agent">...</Chat>

// Transaction setup page
<Chat agentId="transaction-setup">...</Chat>
```

**Pros:**
- Straightforward, no switching logic
- Each page fully controls its chat

**Cons:**
- Chat state lost on navigation
- No shared chat experience

### If Chat is at Layout Level

Need a mechanism for pages to specify their desired agent. Options:

#### Option A: Route-Based Agent Mapping

Define agent mapping based on route patterns:

```typescript
const routeAgentMap: Record<string, string> = {
  "/transaction-setup": "transaction-setup",
  "/bdx-setup": "bdx-setup",
  // Default: "korra-agent"
};

function ChatOrchestrator() {
  const pathname = usePathname();

  const agentId = useMemo(() => {
    for (const [pattern, agent] of Object.entries(routeAgentMap)) {
      if (pathname.startsWith(pattern)) return agent;
    }
    return "korra-agent";
  }, [pathname]);

  return <Chat agentId={agentId}>...</Chat>;
}
```

**Pros:**
- Centralized configuration
- No page-level code needed
- Easy to understand

**Cons:**
- Less flexible for dynamic cases
- Mapping can get complex with nested routes

#### Option B: Page-Declared Agent via Context

Pages declare their desired agent:

```typescript
// Page usage
function TransactionSetupPage() {
  useChatAgent("transaction-setup");
  return <TransactionSetupForm />;
}

// Hook implementation
function useChatAgent(agentId: string) {
  const { setAgent } = useChatConfig();

  useEffect(() => {
    setAgent(agentId);
    return () => setAgent("korra-agent"); // Reset to default on unmount
  }, [agentId]);
}

// ChatOrchestrator reads from context
function ChatOrchestrator() {
  const { agentId } = useChatConfig(); // Default: "korra-agent"
  return <Chat agentId={agentId}>...</Chat>;
}
```

**Pros:**
- Pages have explicit control
- Flexible for dynamic cases
- Clear which pages customize the agent

**Cons:**
- Requires page to call hook
- Potential for forgotten cleanup

#### Option C: Combined Route + Override

Route-based defaults with page override capability:

```typescript
function ChatOrchestrator() {
  const pathname = usePathname();
  const pageOverride = useChatConfig().agentId; // May be null

  const agentId = pageOverride || getAgentForRoute(pathname) || "korra-agent";

  return <Chat agentId={agentId}>...</Chat>;
}
```

**Pros:**
- Sensible defaults from routes
- Pages can still override
- Best of both worlds

**Cons:**
- More complex logic
- Need to track what's a route default vs override

### What Happens When Agent Changes?

When navigating from a page with one agent to another:

1. **Keep same chat, different agent?**
   - Confusing - conversation history was with different agent
   - Agent might not understand context from other agent

2. **Start new chat?**
   - Clean slate for new agent
   - Loses conversation continuity

3. **Load different chat for different agent?**
   - Each agent has its own chat history
   - User can have parallel conversations
   - More complex state management

**Recommendation**: For entity-bound chats (transaction setup), always use entity's chat. For standalone chats, could either:
- Reset when agent changes (simple)
- Maintain separate chat per agent (more complex but richer)

### Skills and Agents

User clarification: **Skills should be based on agent, not page**.

This means:
- Each agent has a set of available skills
- When agent changes, available skills change
- Skills are not page-specific

```typescript
interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;
  availableSkills: string[];      // Skills this agent can load
  defaultLoadedSkills: string[];  // Skills loaded on start
}

// Example
const agents: Record<string, AgentConfig> = {
  "korra-agent": {
    availableSkills: ["transaction-manager", "scope-bookmark-manager"],
    defaultLoadedSkills: [],
  },
  "transaction-setup": {
    availableSkills: [],  // No skills, all tools always available
    defaultLoadedSkills: [],
  },
};
```

---

## Gaps and Inconsistencies

### 1. No Entity Binding for Chats

**Problem**: Transaction setup chat should be linked to a `transactionSetupId`, not use a random chat ID.

**Current State**:

```typescript
const chatId = useMemo(() => createId("chat"), []); // Random, not linked to entity
```

**Desired State**:

```typescript
// Chat is fetched/created based on the entity
const { chatId } = useChatForEntity("transaction-setup", transactionSetupId);
```

**Missing**:
- Database fields for entity binding (`boundEntityType`, `boundEntityId`)
- Service function `getChatForEntity`
- Hook for pages to use entity-bound chats

### 2. Inconsistent Context Passing

**Problem**: Different chats pass context differently.

| Chat Type | Context Passed | Method |
|-----------|----------------|--------|
| Main Chat | `AppScope` | Body of request |
| Transaction Setup | `formValues` | Body of request |
| BDX Setup | `fileInfo`, `selection` | Body of request |
| Sidebar | Varies | Inconsistent |

**Missing**: Standardized context schema and injection pattern.

### 3. Excel/Univer Tools Not Integrated

**Problem**: BDX setup has Excel viewer but no tools to interact with it.

**Current State**:
- `ask-for-worksheet-selection` tool is defined but commented out
- No tools for reading cell values, ranges, or sheet data

**Missing**: Complete tool suite for Univer sheet integration.

### 4. No Route/Page Context

**Problem**: AI doesn't know what page the user is viewing.

**Current State**: Route information not consistently passed to chat context.

**Desired State**: AI should always know:
- Current route/page
- Available actions on current page
- Relevant data being viewed

### 5. Chat Provider Placement Challenge

**Problem**: The `useChat` hook provides `addToolOutput` and `onToolCall` which are only accessible within the Chat provider's React tree. This creates tension between:

- **Layout-level placement**: Chat persists across navigation, but pages can't easily access tool APIs
- **Page-level placement**: Easy tool access, but chat state lost on navigation

**Current State**: Different pages use different patterns inconsistently.

**Key Insight**: Layout-level and page-level chat providers are **mutually exclusive** (can't have nested chats).

**See**: "Critical Challenge: Chat Provider Placement" section for detailed analysis and proposed solutions.

---

## Proposed Architecture

### Chat Type Classification

All chats are persisted. The distinction is how they're identified and organized:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CHAT TYPES                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │   STANDALONE CHAT   │    │  ENTITY-BOUND CHAT  │            │
│  │   (Own identity)    │    │  (Linked to entity) │            │
│  ├─────────────────────┤    ├─────────────────────┤            │
│  │ • Main Chat         │    │ • Transaction Setup │            │
│  │ • General Sidebar   │    │ • BDX Setup         │            │
│  │ • Ad-hoc questions  │    │ • Document Review   │            │
│  └─────────────────────┘    └─────────────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┤
│  │                    TOOL EXECUTION                           │
│  ├─────────────────────┬───────────────────────────────────────┤
│  │    SERVER-SIDE      │         CLIENT-SIDE                  │
│  ├─────────────────────┼───────────────────────────────────────┤
│  │ • DB Operations     │ • Form Manipulation                  │
│  │ • API Calls         │ • UI State Changes                   │
│  │ • External Services │ • Sheet Interactions                 │
│  │ • Secrets/Auth      │ • Navigation                         │
│  └─────────────────────┴───────────────────────────────────────┤
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Standalone Chats**: Have their own `chatId`, appear in chat history, user can return to them anytime.

**Entity-Bound Chats**: Linked to a parent entity via `boundToId`. When user opens that entity (e.g., a transaction setup session), the associated chat loads automatically.

### Context Schema Proposal

```typescript
interface ChatContext {
  // Route Information
  route: {
    path: string;
    params: Record<string, string>;
    searchParams: Record<string, string>;
  };

  // Application State
  scope?: AppScope;

  // Page-Specific Context
  pageContext?:
    | { type: "transaction-setup"; formValues: TransactionSetupFormData }
    | { type: "bdx-setup"; fileInfo: ExcelFileInfo; selection?: ExcelWorksheetSelection }
    | { type: "transaction-detail"; transactionId: string }
    | { type: "dashboard"; visibleWidgets: string[] };

  // Available Client-Side Actions
  availableActions?: string[];
}
```

### Chat Provider Hierarchy (Recommended: Layout-Level)

Based on the analysis in "Critical Challenge: Chat Provider Placement", the recommended approach is a single Chat provider at layout level with dynamic tool handler registration:

```
┌─────────────────────────────────────────────────────────────────┐
│                       PROTECTED LAYOUT                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Chat Provider                           │  │
│  │  (Single instance, agentId changes per page)              │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │           ClientToolHandlerRegistry                  │  │  │
│  │  │  (Pages register/unregister tool handlers here)     │  │  │
│  │  │                                                      │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │           ResizablePanels                      │  │  │  │
│  │  │  │  ┌─────────────┐  ┌────────────────────────┐  │  │  │  │
│  │  │  │  │ Primary     │  │ Secondary              │  │  │  │  │
│  │  │  │  │ (children)  │  │ (ChatSidePanel)        │  │  │  │  │
│  │  │  │  │             │  │                        │  │  │  │  │
│  │  │  │  │ Pages can   │  │ Always available       │  │  │  │  │
│  │  │  │  │ register    │  │ Uses current agent     │  │  │  │  │
│  │  │  │  │ handlers    │  │ and context            │  │  │  │  │
│  │  │  │  └─────────────┘  └────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points**:
- Single `Chat` provider at layout level
- Pages dynamically register their client-side tool handlers
- Agent and context change based on current route
- Sidebar chat UI always available in secondary panel
- No nested chats problem

---

## Recommended Patterns

### 1. Standard Context Provider

Create a `ChatContextProvider` that standardizes context passing:

```typescript
// Proposed: src/components/chat/chat-context-provider.tsx

interface ChatContextProviderProps {
  children: React.ReactNode;
  pageContext?: PageContext;
  availableActions?: string[];
}

export function ChatContextProvider({ children, pageContext, availableActions }: Props) {
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  const context: ChatContext = useMemo(() => ({
    route: {
      path: pathname,
      params: Object.fromEntries(Object.entries(params)),
      searchParams: Object.fromEntries(searchParams.entries()),
    },
    scope: useAppStore.getState().scope,
    pageContext,
    availableActions,
  }), [pathname, params, searchParams, pageContext, availableActions]);

  return (
    <ChatContextContext.Provider value={context}>
      {children}
    </ChatContextContext.Provider>
  );
}
```

### 2. Client-Side Tool Registry

Create a registry pattern for client-side tools:

```typescript
// Proposed: src/lib/chat/client-tools.ts

type ClientToolHandler<TInput, TOutput> = (
  input: TInput,
  helpers: {
    formState?: FormState;
    sheetRef?: SheetRef;
    navigate: (path: string) => void;
  }
) => Promise<TOutput>;

const clientToolRegistry = new Map<string, ClientToolHandler<unknown, unknown>>();

export function registerClientTool<TInput, TOutput>(
  name: string,
  handler: ClientToolHandler<TInput, TOutput>
) {
  clientToolRegistry.set(name, handler);
}

export function createClientToolHandler(helpers: ToolHelpers) {
  return async ({ toolCall }: { toolCall: ToolCall }, addToolOutput: AddToolOutput) => {
    const handler = clientToolRegistry.get(toolCall.toolName);
    if (handler) {
      const output = await handler(toolCall.args, helpers);
      addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output });
    }
  };
}
```

### 3. Entity-Bound Chat Storage

For chats tied to specific entities (transaction setups, BDX sessions, etc.), we extend the existing chat schema:

```typescript
// Option A: Add binding fields to existing chats table
// Proposed: src/db/schema/chat.ts

export const chats = pgTable("chats", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title"),

  // NEW: Entity binding fields
  boundEntityType: text("bound_entity_type"), // "transaction-setup" | "bdx-setup" | null
  boundEntityId: text("bound_entity_id"),     // The entity's ID, or null for standalone

  // Status for entity-bound chats
  status: text("status").default("active"),   // "active" | "completed" | "abandoned"

  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// Index for efficient lookup by entity
// CREATE INDEX idx_chats_bound_entity ON chats(bound_entity_type, bound_entity_id);
```

**Usage**:
- Standalone chats: `boundEntityType` and `boundEntityId` are null
- Entity-bound chats: Both fields populated, creating a one-to-one relationship

**Lookup Pattern**:
```typescript
// Get chat for a transaction setup (creates if doesn't exist)
async function getChatForEntity(
  userId: string,
  entityType: "transaction-setup" | "bdx-setup",
  entityId: string
): Promise<Chat> {
  const existing = await db.query.chats.findFirst({
    where: and(
      eq(chats.userId, userId),
      eq(chats.boundEntityType, entityType),
      eq(chats.boundEntityId, entityId)
    ),
  });

  if (existing) return existing;

  return await db.insert(chats).values({
    id: createId("chat"),
    userId,
    boundEntityType: entityType,
    boundEntityId: entityId,
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).returning();
}
```

### 4. Agent Skill Configuration

Improve skill configuration for agents:

```typescript
// Proposed: src/lib/ai/agents/agent-config.ts

interface AgentConfig {
  id: string;
  name: string;
  systemPrompt: string;

  // Skills Configuration
  skills: {
    defaultLoaded: string[];        // Skills loaded on start
    available: string[];            // Skills that can be loaded
    autoLoad: {                     // Skills loaded based on context
      condition: (context: ChatContext) => boolean;
      skill: string;
    }[];
  };

  // Tool Configuration
  tools: {
    serverSide: string[];           // Tools executed on server
    clientSide: string[];           // Tools requiring client execution
    requiresApproval: string[];     // Tools needing user approval
  };

  // Context Requirements
  context: {
    required: (keyof ChatContext)[];
    optional: (keyof ChatContext)[];
  };
}
```

### 5. Sidebar Chat Implementation

**Important**: Layout-level and page-level chat providers are **mutually exclusive**. The protected layout wraps all pages, so if you have a Chat at layout level, pages cannot create their own without nesting issues.

**Recommended Approach: Layout-Level with Dynamic Configuration**

```typescript
// app/(protected)/layout.tsx
export default function ProtectedLayout({ children }) {
  return (
    <ChatProvider> {/* Single chat instance */}
      <ClientToolHandlerRegistry>
        <AppLayoutResizable>
          <AppLayoutResizablePanelPrimary>
            {children}
          </AppLayoutResizablePanelPrimary>
          <AppLayoutResizablePanelSecondary>
            <DynamicSidebarChat /> {/* Agent/context from current page */}
          </AppLayoutResizablePanelSecondary>
        </AppLayoutResizable>
      </ClientToolHandlerRegistry>
    </ChatProvider>
  );
}
```

**Page Configuration Example**:

```typescript
// app/(protected)/transaction-setup/page.tsx
export default function TransactionSetupPage() {
  const form = useForm<TransactionSetupFormData>();

  // Register page-specific tool handlers
  useRegisterToolHandler("read-form-values", async (input) => {
    return getFormValues(form, input.fields);
  });

  useRegisterToolHandler("update-form-values", async (input) => {
    setFormValues(form, input.values);
    return { success: true };
  });

  // Configure chat for this page
  useChatPageConfig({
    agentId: "transaction-setup",
    entityBinding: { type: "transaction-setup", id: transactionSetupId },
    context: { formValues: form.values },
  });

  return <TransactionSetupForm form={form} />;
}
```

**How Different Pages Behave**:

| Page | Agent | Entity Binding | Client Tools |
| ---- | ----- | -------------- | ------------ |
| Dashboard | `korra-agent` | None (standalone) | None |
| Transactions | `korra-agent` | None (standalone) | None |
| Transaction Setup | `transaction-setup` | `transactionSetupId` | Form tools |
| BDX Setup | `bdx-setup` | `bdxSessionId` | Sheet tools |

**Chat History Behavior**:
- Standalone chats appear in main chat history
- Entity-bound chats appear when viewing that entity
- Both are persisted to database

---

## Univer/Excel Integration Proposal

### Tool Suite for Sheet Interaction

```typescript
// Proposed tools for BDX/Excel context

// Read Operations
"sheet-get-cell-value": Read single cell value
"sheet-get-range-values": Read range of cells
"sheet-get-sheet-names": List available sheets
"sheet-get-selection": Get currently selected range
"sheet-search-values": Search for specific values

// Write Operations (if needed)
"sheet-set-cell-value": Write to single cell
"sheet-set-range-values": Write to range
"sheet-highlight-range": Highlight cells for user attention

// Navigation
"sheet-navigate-to-cell": Scroll to specific cell
"sheet-select-range": Programmatically select range
```

### Context Flow for BDX

```
1. User uploads Excel file
   ↓
2. File parsed, sheets enumerated
   ↓
3. Chat receives fileInfo context
   ↓
4. AI has access to sheet tools
   ↓
5. AI can read/analyze data
   ↓
6. User selects ranges (AI guided)
   ↓
7. AI validates and processes
```

---

## Implementation Priorities

### Phase 1: Chat Provider Architecture (High Priority)

1. **Layout-Level Chat Provider**
   - Move Chat provider to protected layout
   - Implement `ClientToolHandlerRegistry` context
   - Create `useRegisterToolHandler` hook for pages

2. **Dynamic Agent/Context Configuration**
   - Create `useChatPageConfig` hook
   - Allow pages to specify agentId, context, entity binding
   - Handle agent switching on navigation

3. **Entity-Bound Chat Storage**
   - Add `boundEntityType` and `boundEntityId` to chats table
   - Create `getChatForEntity` service function
   - Update chat creation flow

### Phase 2: Client Tools (Medium Priority)

4. **Client Tool Handler Registry**
   - Implement registry pattern with register/unregister
   - Handle cleanup on page unmount
   - Migrate form tools from transaction setup

5. **Standardize Context Schema**
   - Create unified `ChatContext` type
   - Implement route/page context collection
   - Update all chat implementations to use it

6. **Fix Type Safety**
   - Resolve `dbMessageToAIMessage` type mismatch
   - Ensure consistent message types throughout

### Phase 3: Excel Integration (Medium Priority)

7. **Sheet Tool Suite**
   - Implement read tools (get cell, get range, get selection)
   - Add navigation tools (go to cell, select range)
   - Register as client-side tools in BDX page

8. **BDX Workflow Completion**
   - Connect tools to Univer instance via refs
   - Implement guided selection flow

### Phase 4: Advanced Features (Lower Priority)

9. **Auto-Loading Skills**
   - Context-based skill activation
   - Page-specific skill bundles

10. **Chat History UI Updates**
    - Distinguish standalone vs entity-bound in UI
    - Group entity-bound chats by entity type

11. **Metrics and Observability**
    - Surface response times
    - Track tool usage patterns

---

## Questions and Decisions

### Resolved

1. **Entity-Bound Chat Completion**
   - **Decision**: Keep the chat as history. When entity is completed, chat remains accessible from that entity.
   - Future enhancement: Could add completion indicators or archival.

2. **Skill Auto-Loading**
   - **Decision**: Skills are agent-based, not page-based.
   - Each agent defines its available and default-loaded skills.
   - Pages don't control skills directly.

3. **Tool Approval Flow**
   - **Decision**: Not a priority for now.
   - General guideline: Tools that modify data might need approval.
   - Should be configurable on a per-tool basis when needed.

4. **Entity-Bound Chats in History**
   - **Decision**: Keep them separate from standalone chat history.
   - Entity-bound chats only visible from the entity itself (e.g., when viewing a transaction setup).
   - General chat history shows only standalone chats.

### Still Open

5. **Chat Provider Placement**: Layout-level vs page-level?
   - Layout-level enables "always available" chat but adds complexity
   - Page-level is simpler but loses state on navigation
   - Need to prototype both to evaluate trade-offs

6. **Tool Handler Registration**: useEffect vs declarative vs context?
   - See "Tool Handler Registration Options" section for analysis
   - Likely context-based for simple cases, useEffect for complex

7. **Agent Switching Behavior**: What happens when navigating between pages with different agents?
   - For entity-bound: Use entity's chat (clear)
   - For standalone: Reset? Or separate chat per agent?
   - Needs decision based on desired UX

8. **Error Recovery**: How should the AI handle tool execution failures?
   - Not critical for MVP
   - Could retry, escalate to user, or return error to AI

9. **Context Limits**: How much context is too much?
   - Balance between AI having enough info vs token costs
   - May need experimentation

---

## Appendix: Current File Structure

```
src/
├── components/
│   └── chat/
│       ├── chat.tsx                 # Main Chat provider
│       ├── parts/
│       │   ├── chat-messages.tsx    # Message rendering
│       │   ├── chat-input-composed.tsx
│       │   └── composed-tool.tsx
│       └── chat-side-panel.tsx      # Reusable side panel
│
├── lib/
│   └── ai/
│       ├── agents/
│       │   ├── agent-respond.ts     # Response handler
│       │   └── agents/              # Agent definitions
│       ├── skills/
│       │   └── registry/            # Skill definitions
│       └── tools/
│           └── (registry)/          # Tool definitions
│
├── db/
│   ├── schema/
│   │   └── chat.ts                  # Chat database schema
│   └── services/
│       └── chat.ts                  # Chat service layer
│
└── hono/
    └── routes/
        └── protected/
            └── chat.ts              # Chat API routes
```

---

## Conclusion

### AI-Native Readiness Summary

**Current State**: The application has solid foundations for AI-native but is primarily chat-centric. AI lives in a sidebar; it doesn't permeate the experience.

**Strengths**:
- Shared service layer between UI and AI (capability parity)
- Composable chat components
- Client-side tool execution pattern
- Message persistence

**Gaps to Address (Priority Order)**:

1. **Context Awareness** - AI needs to know what user is viewing
2. **App Documentation for AI** - AI should know the app (routes, features, how-tos) - same docs serve Help section
3. **AI-Triggered UI Actions** - Navigate, filter, highlight from AI
4. **Contextual Entry Points** - Quick AI actions throughout UI
5. **Entity-Bound Chats** - Tie chats to workflows, not just standalone
6. **AI Action Audit** - Track and enable undo of AI actions

**Potentially Over-Engineered**:
- Skill system (consider simpler agent-level tools)
- Approval workflow (not actively used)
- Message part type complexity

### Chat Architecture Decisions

**Confirmed**:
1. All chats persisted (standalone or entity-bound, never ephemeral)
2. Entity-bound chats visible only from their entity
3. Skills are agent-based, not page-based

**Requires Prototyping**:
1. Chat provider placement (layout vs page level)
2. Tool handler registration approach
3. Agent switching behavior

### Recommended Implementation Path

**Phase 1: Foundation**
- Pick chat placement approach and prototype
- Add entity binding to database
- Implement basic context passing (current page, selected items)
- Create app documentation structure (routes, features, how-tos)

**Phase 2: Context Awareness**
- Pass page/view context to AI consistently
- AI can reference app documentation to answer "how do I..." questions
- Add AI-triggered navigation tools
- Create `AIQuickAction` component for contextual AI entry points

**Phase 3: Enhanced Experience**
- AI action history/audit log
- Multi-turn task flows
- AI-powered search
- Help section powered by same documentation

**Phase 4: Advanced (Future)**
- Proactive AI suggestions
- User preference learning
- AI pattern detection

### What "Done" Looks Like

An AI-native Keystone application where:
- User can ask "help me with this" from anywhere and AI knows what "this" is
- AI can navigate user to relevant data, not just describe it
- Every list, table, and form has contextual AI actions
- User can review what AI did and undo if needed
- AI and user workflows are interleaved seamlessly

The chat system is one piece of this. The bigger picture is making AI a first-class citizen throughout the application, not just a sidebar utility.
