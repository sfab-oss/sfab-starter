# AI-Native Implementation Guide

This document provides a concrete implementation blueprint for making Keystone a truly AI-native application. It covers the full stack from UI components to server-side processing.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [UI Component Structure](#ui-component-structure)
3. [Chat System Implementation](#chat-system-implementation)
4. [Tool Execution Pipeline](#tool-execution-pipeline)
5. [Context System](#context-system)
6. [Agent Configuration](#agent-configuration)
7. [Application Documentation](#application-documentation)
8. [API Routes](#api-routes)
9. [Database Schema](#database-schema)
10. [Complete Examples](#complete-examples)

---

## Architecture Overview

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   App Shell  │  │  Page Content │  │  Chat Panel  │                  │
│  │   (Layout)   │  │   (Dynamic)   │  │  (Sidebar)   │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                 │                  │                          │
│         └────────────┬────┴──────────────────┘                          │
│                      ▼                                                   │
│         ┌────────────────────────┐                                      │
│         │   ChatOrchestrator     │                                      │
│         │   (Layout Level)       │                                      │
│         └───────────┬────────────┘                                      │
│                     │                                                    │
│    ┌────────────────┼────────────────┐                                  │
│    ▼                ▼                ▼                                  │
│  ┌─────────┐  ┌───────────┐  ┌─────────────┐                           │
│  │ Context │  │  Tool     │  │   Agent     │                           │
│  │ Provider│  │  Handlers │  │   Config    │                           │
│  └────┬────┘  └─────┬─────┘  └──────┬──────┘                           │
│       └─────────────┼───────────────┘                                   │
│                     ▼                                                    │
└─────────────────────┼───────────────────────────────────────────────────┘
                      │
                      ▼ HTTP/Streaming
┌─────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                    POST /api/chat/messages                      │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                │                                         │
│                                ▼                                         │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │                      Agent Orchestrator                         │     │
│  │  • Resolve chat (standalone or entity-bound)                   │     │
│  │  • Load agent config                                            │     │
│  │  • Build system prompt with context                            │     │
│  │  • Execute with tools                                           │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                │                                         │
│              ┌─────────────────┼─────────────────┐                      │
│              ▼                 ▼                 ▼                      │
│       ┌───────────┐     ┌───────────┐     ┌───────────┐                │
│       │  Server   │     │  Client   │     │   App     │                │
│       │  Tools    │     │  Tools    │     │   Docs    │                │
│       │ (execute) │     │ (schema)  │     │ (context) │                │
│       └─────┬─────┘     └─────┬─────┘     └───────────┘                │
│             │                 │                                         │
│             ▼                 │ Returns to client for execution        │
│       ┌───────────┐           │                                         │
│       │  Service  │           │                                         │
│       │  Layer    │           │                                         │
│       └─────┬─────┘           │                                         │
│             ▼                 │                                         │
│       ┌───────────┐           │                                         │
│       │  Database │           │                                         │
│       └───────────┘           │                                         │
│                               │                                         │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │
                                ▼ Tool call sent to client
┌─────────────────────────────────────────────────────────────────────────┐
│                     CLIENT-SIDE TOOL EXECUTION                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    ToolHandlerRegistry                           │    │
│  │  • Page registers handlers on mount                             │    │
│  │  • Matches tool call to handler                                 │    │
│  │  • Executes handler with React state access                     │    │
│  │  • Returns result via addToolOutput                             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Chat Provider Placement | Layout level | Always-available chat, state preserved across navigation |
| Tool Handler Registration | Context-based with ref pattern | Clean API, handles stale closures |
| Agent Configuration | Route-based with page override | Sensible defaults, flexible when needed |
| Chat Persistence | All chats persisted | Never ephemeral, either standalone or entity-bound |
| Skills | Agent-based | Defined per agent, not per page |

---

## Layout-Level Chat: Advantages and Disadvantages

This architecture places the Chat provider at the layout level, with pages using hooks to register tool handlers, configure agents, and provide context. Here's a thorough analysis:

### Advantages

| Advantage | Description |
| --------- | ----------- |
| **Always Available** | Chat sidebar is always present. User can ask questions from any page without navigating away. |
| **State Preservation** | Conversation history survives navigation. User doesn't lose context when moving between pages. |
| **Consistent UX** | Same chat experience everywhere. User always knows where to find it. |
| **Single Instance** | One chat, one conversation. No confusion about multiple chat states. |
| **Shared Tool Results** | If AI navigates user to a new page, the conversation continues seamlessly. |
| **Reduced Re-renders** | Chat component doesn't unmount/remount on navigation, potentially better performance for the chat UI itself. |

### Disadvantages

| Disadvantage | Description | Mitigation |
| ------------ | ----------- | ---------- |
| **Tool Registration Complexity** | Pages must register/unregister handlers via hooks. More boilerplate than just passing props. | Use well-designed hooks (`useRegisterToolHandler`) that handle cleanup automatically. |
| **Stale Closure Risk** | Tool handlers might capture stale state if not careful. | Use refs pattern: `handlerRef.current = handler` updated in `useLayoutEffect`. |
| **Race Conditions** | Tool might be called during navigation while handler is being unregistered. | Check if handler exists before calling. Return graceful error if missing. |
| **Agent Switching Complexity** | Different pages want different agents. Need to manage switching and possibly reset history. | Clear strategy: entity-bound chats use entity's agent, standalone chats can switch or reset. |
| **Message History Confusion** | If agent changes, old messages from different agent might not make sense. | Either reset on agent change, or clearly indicate agent switch in UI. |
| **Context Dependency on Hooks** | Page context relies on `useChatPageConfig` being called correctly. Easy to forget. | Good defaults, TypeScript enforcement, documentation. |
| **Testing Complexity** | Harder to test chat in isolation; always need the layout wrapper. | Create test utilities that provide mock layout context. |
| **Layout Constraints** | Resizable panel always in layout. Can't have pages with completely different layouts. | Use conditional rendering or different layout groups if truly needed. |
| **Bundle Size** | Chat code loaded for all protected pages, even if user never opens chat. | Code splitting, lazy load chat panel content. |
| **Memory Overhead** | Chat provider always mounted, holding message state. | Paginate old messages, don't keep entire history in memory. |

### When Layout-Level Works Well

- AI-native apps where chat should always be available
- Apps where conversation context should persist across navigation
- Apps where AI can take actions that affect multiple pages
- Apps with relatively uniform page layouts

### When Page-Level Might Be Better

- Apps where chat is only relevant on specific pages
- Apps with very different layouts per section
- Simpler apps where tool registration complexity isn't worth it
- Apps where each page's chat should be completely independent

### The Hook Pattern Trade-offs

The layout-level approach requires several hooks:

```typescript
// Pages need to call these hooks correctly:
useChatPageConfig({ agentId, entityBinding, context });
useRegisterToolHandler("tool-name", handler);
```

**Pros of hooks:**
- Declarative - page declares what it needs
- Automatic cleanup on unmount
- Composable - can use in child components too

**Cons of hooks:**
- Must be called at top level (React rules)
- Order of registration can matter
- Easy to forget to call them
- Hard to debug when something doesn't register correctly

### Alternative: Render Props / Children Pattern

Instead of hooks, could use a component-based approach:

```typescript
// Instead of hooks:
<ChatPageConfig agentId="transaction-setup" entityBinding={...}>
  <ToolHandler name="read-form" handler={readFormHandler} />
  <ToolHandler name="update-form" handler={updateFormHandler} />
  <TransactionSetupForm />
</ChatPageConfig>
```

**Pros:**
- More visible in JSX
- Easier to see what's registered
- Follows React composition patterns

**Cons:**
- More nesting
- Still needs useEffect internally
- Harder to conditionally register tools

### Recommendation

The layout-level approach with hooks is **worth the complexity for an AI-native app** because:

1. The "always available" experience is core to AI-native
2. The tool registration pattern, while complex, is learnable
3. The stale closure issue has a known solution (refs)
4. The benefits (persistent chat, seamless navigation) outweigh the costs

However, be aware of the trade-offs and document the patterns clearly for the team.

---

## Chat History and Multiple Conversations

Even with layout-level chat, users need to:
- Create new conversations
- Switch between existing conversations
- View their chat history
- Clear/reset the current conversation

### How Multiple Conversations Work

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONVERSATION TYPES                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STANDALONE CONVERSATIONS          ENTITY-BOUND CONVERSATIONS  │
│  ─────────────────────────         ──────────────────────────  │
│                                                                 │
│  • User creates explicitly         • Created automatically     │
│  • Shown in chat history           • NOT in main history       │
│  • Switched via URL param          • Loaded when viewing entity│
│  • Can have multiple               • One per entity            │
│                                                                 │
│  Example:                          Example:                    │
│  /transactions?chatId=chat_123     /transaction-setup/setup_456│
│  /dashboard?chatId=chat_789        /bdx-setup/bdx_012          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Chat Management Functions

The `ChatProvider` exposes these functions for managing conversations:

```typescript
interface ChatContextValue {
  // ... existing state and sendMessage ...

  // Conversation management
  currentChatId: string | undefined;
  createNewChat: () => Promise<string>;      // Returns new chatId
  switchToChat: (chatId: string) => void;    // Switch to existing chat
  clearMessages: () => void;                  // Clear current chat (keeps chat, removes messages)

  // History access
  isEntityBound: boolean;                     // True if chat is tied to an entity
}
```

### Implementation

```typescript
// src/components/chat/chat-provider.tsx

export function ChatProvider({ children, chatId, agentId, initialMessages }: ChatProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { entityBinding } = useChatConfig();

  // ... useChat setup ...

  // Create a new standalone conversation
  const createNewChat = useCallback(async () => {
    // Call API to create new chat
    const response = await fetch("/api/chat/create", {
      method: "POST",
      body: JSON.stringify({ agentId }),
    });
    const { chatId: newChatId } = await response.json();

    // Navigate to new chat (updates URL, triggers ChatOrchestrator to reload)
    const params = new URLSearchParams(searchParams.toString());
    params.set("chatId", newChatId);
    router.push(`${pathname}?${params.toString()}`);

    return newChatId;
  }, [agentId, pathname, searchParams, router]);

  // Switch to an existing conversation
  const switchToChat = useCallback((targetChatId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("chatId", targetChatId);
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, searchParams, router]);

  // Clear messages from current chat
  const clearMessages = useCallback(async () => {
    if (!chatId) return;

    // Call API to clear messages
    await fetch(`/api/chat/${chatId}/messages`, {
      method: "DELETE",
    });

    // Reset local state
    setMessages([]);

    // Invalidate cache
    queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
  }, [chatId, setMessages, queryClient]);

  const isEntityBound = !!entityBinding;

  // ... rest of provider ...
}
```

### Chat History Component

```typescript
// src/components/chat/chat-history.tsx

"use client";

import { useQuery } from "@tanstack/react-query";
import { useChatContext } from "./chat-provider";
import { formatDistanceToNow } from "date-fns";

export function ChatHistory() {
  const { currentChatId, switchToChat, createNewChat, isEntityBound } = useChatContext();

  // Don't show history for entity-bound chats
  if (isEntityBound) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        This conversation is tied to the current workflow.
      </div>
    );
  }

  // Fetch standalone chat history
  const { data: chats, isLoading } = useQuery({
    queryKey: ["chats", "standalone"],
    queryFn: () => fetch("/api/chats").then(r => r.json()),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Button onClick={createNewChat} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          New Conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4">Loading...</div>
        ) : (
          <div className="space-y-1 p-2">
            {chats?.map((chat) => (
              <button
                key={chat.id}
                onClick={() => switchToChat(chat.id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg hover:bg-muted",
                  chat.id === currentChatId && "bg-muted"
                )}
              >
                <div className="font-medium truncate">
                  {chat.title || "Untitled conversation"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(chat.updatedAt), { addSuffix: true })}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Chat Header with Actions

```typescript
// src/components/chat/parts/chat-header.tsx

"use client";

import { useChatContext } from "../chat-provider";
import { ChatHistory } from "../chat-history";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function ChatHeader() {
  const {
    currentChatId,
    createNewChat,
    clearMessages,
    isEntityBound,
    agentId,
  } = useChatContext();

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        {/* Chat history popover - only for standalone */}
        {!isEntityBound && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <History className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <ChatHistory />
            </PopoverContent>
          </Popover>
        )}

        <span className="font-medium">
          {isEntityBound ? "Setup Assistant" : "Korra"}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* New chat button - only for standalone */}
        {!isEntityBound && (
          <Button variant="ghost" size="icon" onClick={createNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
        )}

        {/* Clear messages */}
        <Button variant="ghost" size="icon" onClick={clearMessages}>
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

### URL-Based Chat Switching

The chat is determined by URL parameters for standalone conversations:

```
/transactions                    → New or continue last standalone chat
/transactions?chatId=chat_123    → Specific standalone chat
/transaction-setup/setup_456     → Entity-bound chat for that setup
```

When user creates a new chat or switches, the URL updates, which triggers `ChatOrchestrator` to load the appropriate chat.

### API Endpoints for Chat Management

```typescript
// GET /api/chats - List standalone chats
// Returns: { chats: Chat[] }

// POST /api/chat/create - Create new chat
// Body: { agentId: string }
// Returns: { chatId: string }

// DELETE /api/chat/:chatId/messages - Clear messages
// Returns: { success: boolean }

// GET /api/chat/:chatId - Get chat with messages
// Returns: { chat: Chat, messages: Message[] }
```

### Hooks for External Use

Pages or components outside the chat can also manage conversations:

```typescript
// src/hooks/use-chat-management.ts

export function useChatManagement() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const openChat = useCallback((chatId?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (chatId) {
      params.set("chatId", chatId);
    } else {
      params.delete("chatId"); // Will create/continue default
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, searchParams, router]);

  const openNewChat = useCallback(async () => {
    const response = await fetch("/api/chat/create", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const { chatId } = await response.json();
    openChat(chatId);
  }, [openChat]);

  return { openChat, openNewChat };
}
```

### Summary: How Conversations Flow

```
User on /transactions (no chatId param)
  ↓
ChatOrchestrator checks:
  - entityBinding? No
  - chatId param? No
  - → Resolve: get or create default standalone chat
  ↓
User clicks "New Conversation"
  ↓
createNewChat() called
  ↓
API creates new chat, returns chat_xyz
  ↓
URL updates to /transactions?chatId=chat_xyz
  ↓
ChatOrchestrator detects change
  ↓
Loads chat_xyz with empty messages
  ↓
User types message, conversation begins

---

User navigates to /transaction-setup/setup_123
  ↓
ChatOrchestrator checks:
  - entityBinding? Yes (type: "transaction-setup", id: "setup_123")
  - → Resolve: get or create chat for this entity
  ↓
Loads entity-bound chat (may have previous messages from this setup)
  ↓
Chat history button hidden (entity-bound)
  ↓
User completes setup, navigates away
  ↓
Chat preserved, accessible when returning to setup_123
```

---

## UI Component Structure

### Component Hierarchy

```
src/components/
├── chat/
│   ├── chat-orchestrator.tsx      # Layout-level chat state management
│   ├── chat-provider.tsx          # useChat wrapper with context
│   ├── chat-panel.tsx             # Sidebar chat UI container
│   ├── chat-config-provider.tsx   # Page config context
│   ├── tool-handler-registry.tsx  # Client-side tool execution
│   │
│   └── parts/
│       ├── chat-messages.tsx      # Message list rendering
│       ├── chat-input.tsx         # Input with editor
│       ├── chat-header.tsx        # Title, actions
│       ├── message.tsx            # Single message
│       ├── message-content.tsx    # Message parts renderer
│       └── tool-display.tsx       # Tool call/result UI
│
├── ai/
│   ├── ai-quick-action.tsx        # Contextual AI button
│   ├── ai-search-bar.tsx          # Natural language search
│   └── ai-help-button.tsx         # Contextual help trigger
│
└── layout/
    ├── app-layout.tsx             # Main app shell
    ├── resizable-panels.tsx       # Primary/secondary split
    └── sidebar.tsx                # Navigation sidebar
```

### Core Components

#### 1. ChatOrchestrator

The top-level component that manages chat state at the layout level.

```typescript
// src/components/chat/chat-orchestrator.tsx

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useCallback } from "react";

import { ChatProvider } from "./chat-provider";
import { ToolHandlerRegistry } from "./tool-handler-registry";
import { useChatConfig } from "./chat-config-provider";
import { resolveChat } from "@/lib/api/chat";

interface ChatOrchestratorProps {
  children: React.ReactNode;
}

export function ChatOrchestrator({ children }: ChatOrchestratorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get page-level configuration (agent, entity binding, etc.)
  const { agentId, entityBinding, pageContext } = useChatConfig();

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
    staleTime: 0, // Always fresh on navigation
  });

  // Key forces Chat to reset when switching chats
  const chatKey = chatData?.chatId || "loading";

  if (isLoading) {
    return (
      <ToolHandlerRegistry>
        {children}
      </ToolHandlerRegistry>
    );
  }

  // Note: Context is NOT passed here - it's passed with each sendMessage call
  return (
    <ChatProvider
      key={chatKey}
      chatId={chatData?.chatId}
      agentId={agentId}
      initialMessages={chatData?.messages || []}
    >
      <ToolHandlerRegistry>
        {children}
      </ToolHandlerRegistry>
    </ChatProvider>
  );
}
```

#### 2. ChatProvider

Wraps `useChat` and provides chat state to the component tree.

**Important**: Context is passed with each `sendMessage` call, not in the `useChat` hook initialization. This ensures the context reflects the current state when the user sends the message.

```typescript
// src/components/chat/chat-provider.tsx

"use client";

import { createContext, useContext, useCallback, useMemo } from "react";
import { useChat, type Message } from "@ai-sdk/react";
import { useToolHandlers } from "./tool-handler-registry";

interface ChatContextValue {
  // State
  messages: Message[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  sendMessage: (content: string, context: Record<string, unknown>) => void;
  stopGenerating: () => void;
  reload: () => void;

  // Tool execution
  addToolOutput: (output: ToolOutput) => void;

  // Metadata
  chatId: string | undefined;
  agentId: string;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return context;
}

interface ChatProviderProps {
  children: React.ReactNode;
  chatId: string | undefined;
  agentId: string;
  initialMessages: Message[];
}

export function ChatProvider({
  children,
  chatId,
  agentId,
  initialMessages,
}: ChatProviderProps) {
  const toolHandlers = useToolHandlers();

  // Handle tool calls from AI
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
      // Server-side tools don't need client handling
    },
    [toolHandlers]
  );

  const {
    messages,
    isLoading,
    error,
    append,
    stop,
    reload,
    addToolResult,
  } = useChat({
    id: chatId,
    api: `/api/chat/${agentId}/messages`,
    initialMessages,
    body: { chatId }, // Only static data here
    onToolCall: handleToolCall,
  });

  // Context is passed with each message, not at initialization
  const sendMessage = useCallback(
    (content: string, context: Record<string, unknown>) => {
      append(
        {
          role: "user",
          content,
        },
        {
          body: {
            chatId,
            context, // Context passed here, fresh at send time
          },
        }
      );
    },
    [append, chatId]
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      messages,
      isLoading,
      error: error || null,
      sendMessage,
      stopGenerating: stop,
      reload,
      addToolOutput: addToolResult,
      chatId,
      agentId,
    }),
    [messages, isLoading, error, sendMessage, stop, reload, addToolResult, chatId, agentId]
  );

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}
```

#### 3. ToolHandlerRegistry

Manages client-side tool handlers that pages can register.

```typescript
// src/components/chat/tool-handler-registry.tsx

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

interface ToolHandlerRegistryProps {
  children: React.ReactNode;
}

export function ToolHandlerRegistry({ children }: ToolHandlerRegistryProps) {
  const handlersRef = useRef<ToolHandlerMap>({});

  const register = useCallback((name: string, handler: ToolHandler) => {
    handlersRef.current[name] = handler;
  }, []);

  const unregister = useCallback((name: string) => {
    delete handlersRef.current[name];
  }, []);

  const value = {
    handlers: handlersRef,
    register,
    unregister,
  };

  return (
    <ToolHandlerContext.Provider value={value}>
      {children}
    </ToolHandlerContext.Provider>
  );
}

// Hook for pages to register tool handlers
export function useRegisterToolHandler(
  name: string,
  handler: ToolHandler
) {
  const context = useContext(ToolHandlerContext);
  if (!context) {
    throw new Error("useRegisterToolHandler must be used within ToolHandlerRegistry");
  }

  const { register, unregister } = context;
  const handlerRef = useRef(handler);

  // Keep handler ref updated to avoid stale closures
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

#### 4. ChatConfigProvider

Allows pages to configure chat behavior.

```typescript
// src/components/chat/chat-config-provider.tsx

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useLayoutEffect,
  useMemo,
} from "react";

interface EntityBinding {
  type: string;  // "transaction-setup" | "bdx-setup"
  id: string;
}

interface ChatConfig {
  agentId: string;
  entityBinding: EntityBinding | null;
  pageContext: Record<string, unknown>;
}

interface ChatConfigContextValue extends ChatConfig {
  setAgentId: (agentId: string) => void;
  setEntityBinding: (binding: EntityBinding | null) => void;
  setPageContext: (context: Record<string, unknown>) => void;
}

const DEFAULT_AGENT = "korra-agent";

const ChatConfigContext = createContext<ChatConfigContextValue | null>(null);

export function useChatConfig() {
  const context = useContext(ChatConfigContext);
  if (!context) {
    // Return defaults if outside provider (shouldn't happen in practice)
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

  const value = useMemo<ChatConfigContextValue>(
    () => ({
      agentId,
      entityBinding,
      pageContext,
      setAgentId,
      setEntityBinding,
      setPageContext,
    }),
    [agentId, entityBinding, pageContext]
  );

  return (
    <ChatConfigContext.Provider value={value}>
      {children}
    </ChatConfigContext.Provider>
  );
}

// Convenience hook for pages to configure chat
export function useChatPageConfig(config: {
  agentId?: string;
  entityBinding?: EntityBinding;
  context?: Record<string, unknown>;
}) {
  const { setAgentId, setEntityBinding, setPageContext } = useChatConfig() as ChatConfigContextValue;

  useLayoutEffect(() => {
    if (config.agentId) {
      setAgentId(config.agentId);
    }
    if (config.entityBinding) {
      setEntityBinding(config.entityBinding);
    }
    if (config.context) {
      setPageContext(config.context);
    }

    // Reset to defaults on unmount
    return () => {
      setAgentId(DEFAULT_AGENT);
      setEntityBinding(null);
      setPageContext({});
    };
  }, [config.agentId, config.entityBinding, config.context, setAgentId, setEntityBinding, setPageContext]);
}
```

#### 5. AIQuickAction

Contextual AI action button for use throughout the UI.

```typescript
// src/components/ai/ai-quick-action.tsx

"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useChatContext } from "@/components/chat/chat-provider";
import { useChatConfig } from "@/components/chat/chat-config-provider";
import { useAppLayoutResizable } from "@/components/layout/resizable-panels";

interface AIQuickActionProps {
  prompt: string;
  context?: Record<string, unknown>;  // Item-specific context
  label?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default" | "lg" | "icon";
}

export function AIQuickAction({
  prompt,
  context: itemContext,
  label,
  variant = "ghost",
  size = "sm",
}: AIQuickActionProps) {
  const { sendMessage } = useChatContext();
  const { pageContext } = useChatConfig();
  const { setPanelOpen } = useAppLayoutResizable();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleClick = () => {
    // Open chat panel if closed
    setPanelOpen("chat-panel", true);

    // Build full context at click time
    const fullContext = {
      route: {
        path: pathname,
        params: Object.fromEntries(searchParams.entries()),
      },
      ...pageContext,
      // Item-specific context from the quick action
      ...(itemContext && { item: itemContext }),
    };

    sendMessage(prompt, fullContext);
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className="gap-1"
    >
      <Sparkles className="h-3 w-3" />
      {label && <span>{label}</span>}
    </Button>
  );
}
```

---

## Chat System Implementation

### Layout Integration

```typescript
// src/app/(protected)/layout.tsx

import { ChatOrchestrator } from "@/components/chat/chat-orchestrator";
import { ChatConfigProvider } from "@/components/chat/chat-config-provider";
import { ChatPanel } from "@/components/chat/chat-panel";
import {
  AppLayoutResizable,
  AppLayoutResizablePanelPrimary,
  AppLayoutResizablePanelSecondary,
} from "@/components/layout/resizable-panels";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatConfigProvider>
      <ChatOrchestrator>
        <AppLayoutResizable>
          <AppLayoutResizablePanelPrimary id="content" defaultSize={70}>
            {children}
          </AppLayoutResizablePanelPrimary>

          <AppLayoutResizablePanelSecondary
            id="chat-panel"
            defaultSize={30}
            defaultOpen={true}
          >
            <ChatPanel />
          </AppLayoutResizablePanelSecondary>
        </AppLayoutResizable>
      </ChatOrchestrator>
    </ChatConfigProvider>
  );
}
```

### Chat Panel Component

```typescript
// src/components/chat/chat-panel.tsx

"use client";

import { useChatContext } from "./chat-provider";
import { ChatMessages } from "./parts/chat-messages";
import { ChatInput } from "./parts/chat-input";
import { ChatHeader } from "./parts/chat-header";

export function ChatPanel() {
  const { chatId, agentId } = useChatContext();

  return (
    <div className="flex h-full flex-col">
      <ChatHeader chatId={chatId} agentId={agentId} />

      <div className="flex-1 overflow-hidden">
        <ChatMessages />
      </div>

      <div className="border-t p-4">
        <ChatInput />
      </div>
    </div>
  );
}
```

### ChatInput Component

The ChatInput component is responsible for building the context at send time.

```typescript
// src/components/chat/parts/chat-input.tsx

"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useChatContext } from "../chat-provider";
import { useChatConfig } from "../chat-config-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

export function ChatInput() {
  const [input, setInput] = useState("");
  const { sendMessage, isLoading } = useChatContext();
  const { pageContext } = useChatConfig();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Build context fresh at send time
    const context = {
      route: {
        path: pathname,
        params: Object.fromEntries(searchParams.entries()),
      },
      ...pageContext, // Includes page-specific data like form values, selections, etc.
    };

    sendMessage(input.trim(), context);
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask anything..."
        className="min-h-[60px] resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
```

**Key Point**: The context is built in `handleSubmit`, not stored in state. This ensures:
- Context reflects the exact state when the user clicks send
- Form values, selections, and filters are current
- Route information is fresh

### Page-Level Configuration Example

```typescript
// src/app/(protected)/transaction-setup/[id]/page.tsx

"use client";

import { useParams } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { useChatPageConfig } from "@/components/chat/chat-config-provider";
import { useRegisterToolHandler } from "@/components/chat/tool-handler-registry";
import { TransactionSetupForm } from "./transaction-setup-form";

export default function TransactionSetupPage() {
  const { id: transactionSetupId } = useParams<{ id: string }>();

  const form = useForm({
    defaultValues: {
      transactionType: "",
      amount: 0,
      parties: [],
      // ... other fields
    },
  });

  // Configure chat for this page
  useChatPageConfig({
    agentId: "transaction-setup",
    entityBinding: {
      type: "transaction-setup",
      id: transactionSetupId,
    },
    context: {
      formValues: form.state.values,
    },
  });

  // Register form tools
  useRegisterToolHandler("read-form-values", async (input: { fields?: string[] }) => {
    if (input.fields) {
      const values: Record<string, unknown> = {};
      for (const field of input.fields) {
        values[field] = form.getFieldValue(field as any);
      }
      return values;
    }
    return form.state.values;
  });

  useRegisterToolHandler("update-form-values", async (input: { updates: Record<string, unknown> }) => {
    for (const [field, value] of Object.entries(input.updates)) {
      form.setFieldValue(field as any, value);
    }
    return { updated: Object.keys(input.updates) };
  });

  useRegisterToolHandler("validate-form", async () => {
    await form.validate();
    return {
      isValid: form.state.isValid,
      errors: form.state.errors,
    };
  });

  useRegisterToolHandler("submit-form", async () => {
    await form.handleSubmit();
    return { submitted: true };
  });

  return <TransactionSetupForm form={form} />;
}
```

---

## Tool Execution Pipeline

### Tool Types

```typescript
// src/lib/ai/tools/types.ts

import { z } from "zod";

// Server-side tool: Has execute function
export interface ServerTool<TInput, TOutput> {
  type: "server";
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  execute: (input: TInput, context: ToolContext) => Promise<TOutput>;
}

// Client-side tool: Schema only, execution on client
export interface ClientTool<TInput, TOutput> {
  type: "client";
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  // No execute - handled by client
}

// UI action tool: AI can trigger UI changes
export interface UIActionTool<TInput> {
  type: "ui-action";
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  // Executed on client, returns void
}

export type AnyTool = ServerTool<any, any> | ClientTool<any, any> | UIActionTool<any>;

export interface ToolContext {
  userId: string;
  chatId: string;
  agentId: string;
}
```

### Tool Definitions

```typescript
// src/lib/ai/tools/registry/transactions.ts

import { z } from "zod";
import { createServerTool } from "../create-tool";
import { getTransactions, updateTransaction } from "@/db/services/transactions";

export const listTransactions = createServerTool({
  name: "list-transactions",
  description: "List transactions with optional filters",
  inputSchema: z.object({
    status: z.enum(["pending", "approved", "rejected"]).optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    limit: z.number().default(20),
    offset: z.number().default(0),
  }),
  outputSchema: z.object({
    transactions: z.array(z.object({
      id: z.string(),
      type: z.string(),
      amount: z.number(),
      status: z.string(),
      createdAt: z.string(),
    })),
    total: z.number(),
    hasMore: z.boolean(),
  }),
  execute: async (input, { userId }) => {
    const result = await getTransactions(userId, input);
    return {
      transactions: result.items,
      total: result.total,
      hasMore: result.total > input.offset + result.items.length,
    };
  },
});

export const updateTransactionStatus = createServerTool({
  name: "update-transaction-status",
  description: "Update the status of a transaction",
  inputSchema: z.object({
    transactionId: z.string(),
    status: z.enum(["approved", "rejected"]),
    reason: z.string().optional(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    transaction: z.object({
      id: z.string(),
      status: z.string(),
    }),
  }),
  execute: async (input, { userId }) => {
    const transaction = await updateTransaction(userId, input.transactionId, {
      status: input.status,
      statusReason: input.reason,
    });
    return {
      success: true,
      transaction: { id: transaction.id, status: transaction.status },
    };
  },
});
```

### Client-Side Tool Definitions

```typescript
// src/lib/ai/tools/registry/form-tools.ts

import { z } from "zod";
import { createClientTool } from "../create-tool";

export const readFormValues = createClientTool({
  name: "read-form-values",
  description: "Read current values from the form",
  inputSchema: z.object({
    fields: z.array(z.string()).optional().describe("Specific fields to read, or all if not specified"),
  }),
  outputSchema: z.record(z.unknown()),
});

export const updateFormValues = createClientTool({
  name: "update-form-values",
  description: "Update values in the form",
  inputSchema: z.object({
    updates: z.record(z.unknown()).describe("Field names and their new values"),
  }),
  outputSchema: z.object({
    updated: z.array(z.string()),
  }),
});

export const validateForm = createClientTool({
  name: "validate-form",
  description: "Validate the current form state",
  inputSchema: z.object({}),
  outputSchema: z.object({
    isValid: z.boolean(),
    errors: z.record(z.string()).optional(),
  }),
});

export const submitForm = createClientTool({
  name: "submit-form",
  description: "Submit the form",
  inputSchema: z.object({}),
  outputSchema: z.object({
    submitted: z.boolean(),
  }),
});
```

### UI Action Tools

```typescript
// src/lib/ai/tools/registry/ui-actions.ts

import { z } from "zod";
import { createUIActionTool } from "../create-tool";

export const navigateTo = createUIActionTool({
  name: "navigate-to",
  description: "Navigate the user to a specific page",
  inputSchema: z.object({
    path: z.string().describe("The path to navigate to, e.g., /transactions/123"),
  }),
});

export const setFilter = createUIActionTool({
  name: "set-filter",
  description: "Apply filters to the current view",
  inputSchema: z.object({
    filters: z.record(z.unknown()).describe("Filter key-value pairs"),
  }),
});

export const highlightItems = createUIActionTool({
  name: "highlight-items",
  description: "Highlight specific items in the current view",
  inputSchema: z.object({
    itemIds: z.array(z.string()).describe("IDs of items to highlight"),
  }),
});

export const openModal = createUIActionTool({
  name: "open-modal",
  description: "Open a modal dialog",
  inputSchema: z.object({
    modalId: z.string().describe("ID of the modal to open"),
    props: z.record(z.unknown()).optional(),
  }),
});
```

---

## Context System

### Context Schema

```typescript
// src/lib/ai/context/types.ts

export interface RouteContext {
  path: string;
  params: Record<string, string>;
}

export interface ViewContext {
  selectedItems?: string[];
  currentFilters?: Record<string, unknown>;
  visibleData?: DataSummary;
}

export interface DataSummary {
  type: string;
  count: number;
  sample?: unknown[];
}

export interface PageContext {
  type: string;
  data: Record<string, unknown>;
}

export interface ChatContext {
  route: RouteContext;
  view?: ViewContext;
  page?: PageContext;
}
```

### Context Injection in System Prompt

```typescript
// src/lib/ai/agents/build-system-prompt.ts

import { ChatContext } from "../context/types";
import { AppDocumentation, getDocForRoute } from "../docs/app-documentation";

export function buildSystemPrompt(
  agentConfig: AgentConfig,
  context: ChatContext,
  appDocs: AppDocumentation
): string {
  const parts: string[] = [];

  // Base agent prompt
  parts.push(agentConfig.systemPrompt);

  // Route context
  parts.push(`
<current_context>
The user is currently on: ${context.route.path}
</current_context>
`);

  // Page documentation
  const pageDoc = getDocForRoute(appDocs, context.route.path);
  if (pageDoc) {
    parts.push(`
<current_page_info>
Page: ${pageDoc.name}
Description: ${pageDoc.description}
Features: ${pageDoc.features.join(", ")}
</current_page_info>
`);
  }

  // View context (what user is looking at)
  if (context.view) {
    parts.push(`
<user_view>
${context.view.selectedItems?.length ? `Selected items: ${context.view.selectedItems.join(", ")}` : ""}
${context.view.currentFilters ? `Active filters: ${JSON.stringify(context.view.currentFilters)}` : ""}
${context.view.visibleData ? `Viewing: ${context.view.visibleData.count} ${context.view.visibleData.type}` : ""}
</user_view>
`);
  }

  // Page-specific context (form data, etc.)
  if (context.page) {
    parts.push(`
<page_context type="${context.page.type}">
${JSON.stringify(context.page.data, null, 2)}
</page_context>
`);
  }

  return parts.join("\n\n");
}
```

---

## Agent Configuration

### Agent Definition Schema

```typescript
// src/lib/ai/agents/types.ts

export interface AgentConfig {
  id: string;
  name: string;
  description: string;

  // System prompt
  systemPrompt: string;

  // Tools available to this agent
  tools: {
    server: string[];    // Server-side tools
    client: string[];    // Client-side tools (page provides handlers)
    uiActions: string[]; // UI action tools
  };

  // Model configuration
  model: {
    provider: "openai" | "anthropic";
    modelId: string;
    temperature?: number;
    maxTokens?: number;
  };
}
```

### Agent Registry

```typescript
// src/lib/ai/agents/registry.ts

import { AgentConfig } from "./types";

export const agents: Record<string, AgentConfig> = {
  "korra-agent": {
    id: "korra-agent",
    name: "Korra",
    description: "General assistant for the Keystone inventory system",
    systemPrompt: `You are Korra, an AI assistant for the Keystone inventory management system.

You help users manage their insurance transaction inventory. You can:
- Search and filter transactions
- Explain transaction details
- Help with common workflows
- Answer questions about the system

Always be helpful and concise. When users ask about the app, refer to the documentation provided in the context.`,
    tools: {
      server: [
        "list-transactions",
        "get-transaction",
        "get-transaction-stats",
        "update-transaction-favorite",
        "list-scope-bookmarks",
        "create-scope-bookmark",
      ],
      client: [],
      uiActions: [
        "navigate-to",
        "set-filter",
        "highlight-items",
      ],
    },
    model: {
      provider: "openai",
      modelId: "gpt-4o",
      temperature: 0.7,
    },
  },

  "transaction-setup": {
    id: "transaction-setup",
    name: "Transaction Setup Assistant",
    description: "Guides users through creating a new transaction",
    systemPrompt: `You are helping the user set up a new transaction.

You have access to the current form values and can read, update, validate, and submit the form.

Guide the user step by step:
1. Ask what type of transaction they're creating
2. Help them fill in required fields
3. Validate the form before submission
4. Submit when everything is complete

Be proactive - suggest next steps and catch errors early.`,
    tools: {
      server: [],
      client: [
        "read-form-values",
        "update-form-values",
        "validate-form",
        "submit-form",
      ],
      uiActions: [],
    },
    model: {
      provider: "openai",
      modelId: "gpt-4o",
      temperature: 0.5,
    },
  },

  "bdx-setup": {
    id: "bdx-setup",
    name: "BDX Import Assistant",
    description: "Helps users import transactions from Excel files",
    systemPrompt: `You are helping the user import transactions from an Excel file (BDX format).

You can read the uploaded file, help them select the correct data range, and validate the import.

Guide them through:
1. Selecting the correct worksheet
2. Identifying the data range
3. Mapping columns to transaction fields
4. Validating the data
5. Importing the transactions`,
    tools: {
      server: [],
      client: [
        "read-sheet-cell",
        "read-sheet-range",
        "get-sheet-names",
        "select-range",
        "validate-import",
        "execute-import",
      ],
      uiActions: [
        "highlight-cells",
        "scroll-to-cell",
      ],
    },
    model: {
      provider: "openai",
      modelId: "gpt-4o",
      temperature: 0.3,
    },
  },
};

export function getAgent(agentId: string): AgentConfig {
  const agent = agents[agentId];
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }
  return agent;
}
```

---

## Application Documentation

### Documentation Structure

```typescript
// src/lib/ai/docs/types.ts

export interface RouteDoc {
  path: string;
  name: string;
  description: string;
  features: string[];
  howTo: HowToGuide[];
  relatedRoutes: string[];
}

export interface HowToGuide {
  title: string;
  steps: string[];
}

export interface FeatureDoc {
  id: string;
  name: string;
  description: string;
  howTo: HowToGuide;
  relatedRoutes: string[];
  relatedTools: string[];
}

export interface GlossaryEntry {
  term: string;
  definition: string;
}

export interface FAQ {
  question: string;
  answer: string;
  relatedFeatures?: string[];
}

export interface AppDocumentation {
  routes: RouteDoc[];
  features: FeatureDoc[];
  glossary: GlossaryEntry[];
  faqs: FAQ[];
}
```

### Documentation Registry

```typescript
// src/lib/ai/docs/app-documentation.ts

import { AppDocumentation, RouteDoc } from "./types";

export const appDocumentation: AppDocumentation = {
  routes: [
    {
      path: "/transactions",
      name: "Transactions",
      description: "View and manage all transactions in the system",
      features: [
        "View transaction list with sorting and filtering",
        "Search transactions by various criteria",
        "Mark transactions as favorites",
        "Export transactions to CSV",
        "Apply bulk actions to selected transactions",
      ],
      howTo: [
        {
          title: "Filter transactions by status",
          steps: [
            "Click the 'Filters' button in the toolbar",
            "Select the desired status (Pending, Approved, Rejected)",
            "Click 'Apply' to see filtered results",
          ],
        },
        {
          title: "Export transactions",
          steps: [
            "Select the transactions you want to export (or select all)",
            "Click the 'Export' button",
            "Choose CSV format",
            "The file will download automatically",
          ],
        },
      ],
      relatedRoutes: ["/transaction-setup", "/bdx-setup"],
    },
    {
      path: "/transaction-setup",
      name: "Transaction Setup",
      description: "Create a new transaction manually",
      features: [
        "Step-by-step guided form",
        "AI assistance for filling fields",
        "Validation before submission",
        "Draft saving",
      ],
      howTo: [
        {
          title: "Create a new transaction",
          steps: [
            "Click 'New Transaction' from the Transactions page",
            "Select the transaction type",
            "Fill in the required fields (amount, parties, dates)",
            "Review the summary",
            "Click 'Submit' to create the transaction",
          ],
        },
      ],
      relatedRoutes: ["/transactions"],
    },
    {
      path: "/bdx-setup",
      name: "BDX Import",
      description: "Import transactions from an Excel file in BDX format",
      features: [
        "Upload Excel/CSV files",
        "Preview file contents",
        "Select data range",
        "Map columns to fields",
        "Validate before import",
        "Batch import with error handling",
      ],
      howTo: [
        {
          title: "Import transactions from Excel",
          steps: [
            "Navigate to BDX Import from the sidebar",
            "Click 'Upload File' and select your Excel file",
            "Select the worksheet containing the data",
            "Highlight the data range (including headers)",
            "Map each column to the corresponding transaction field",
            "Click 'Validate' to check for errors",
            "Click 'Import' to import the transactions",
          ],
        },
      ],
      relatedRoutes: ["/transactions"],
    },
  ],

  features: [
    {
      id: "transaction-favorites",
      name: "Transaction Favorites",
      description: "Mark transactions as favorites for quick access",
      howTo: {
        title: "Mark a transaction as favorite",
        steps: [
          "Find the transaction in the list",
          "Click the star icon next to the transaction",
          "The transaction is now marked as a favorite",
        ],
      },
      relatedRoutes: ["/transactions"],
      relatedTools: ["update-transaction-favorite"],
    },
    {
      id: "scope-bookmarks",
      name: "Scope Bookmarks",
      description: "Save filter combinations for quick access",
      howTo: {
        title: "Create a scope bookmark",
        steps: [
          "Apply the filters you want to save",
          "Click the bookmark icon in the toolbar",
          "Enter a name for the bookmark",
          "Click 'Save'",
        ],
      },
      relatedRoutes: ["/transactions"],
      relatedTools: ["create-scope-bookmark", "list-scope-bookmarks"],
    },
  ],

  glossary: [
    {
      term: "BDX",
      definition: "Bordereaux - A standard format for exchanging insurance transaction data, typically in Excel format",
    },
    {
      term: "Transaction",
      definition: "A single insurance transaction record, including premium, policy, and party information",
    },
    {
      term: "Scope",
      definition: "A set of filters that define which transactions are visible",
    },
    {
      term: "Policy Group",
      definition: "A collection of related insurance policies managed together",
    },
  ],

  faqs: [
    {
      question: "How do I bulk import transactions?",
      answer: "Use the BDX Import feature. Navigate to /bdx-setup, upload your Excel file, select the data range, map the columns, and import.",
      relatedFeatures: ["bdx-import"],
    },
    {
      question: "Can I undo a transaction approval?",
      answer: "Yes, you can change a transaction's status from Approved back to Pending. Go to the transaction details and click 'Change Status'.",
    },
    {
      question: "How do I find transactions above a certain amount?",
      answer: "Use the filters on the Transactions page. Click 'Filters', then set the minimum amount in the Amount Range filter.",
    },
  ],
};

export function getDocForRoute(docs: AppDocumentation, path: string): RouteDoc | undefined {
  // Exact match first
  const exact = docs.routes.find((r) => r.path === path);
  if (exact) return exact;

  // Try pattern matching for dynamic routes
  for (const route of docs.routes) {
    const pattern = route.path.replace(/\[.*?\]/g, "[^/]+");
    const regex = new RegExp(`^${pattern}$`);
    if (regex.test(path)) {
      return route;
    }
  }

  return undefined;
}

export function searchDocs(
  docs: AppDocumentation,
  query: string
): {
  routes: RouteDoc[];
  features: FeatureDoc[];
  faqs: FAQ[];
} {
  const lowerQuery = query.toLowerCase();

  return {
    routes: docs.routes.filter(
      (r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description.toLowerCase().includes(lowerQuery)
    ),
    features: docs.features.filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) ||
        f.description.toLowerCase().includes(lowerQuery)
    ),
    faqs: docs.faqs.filter(
      (f) =>
        f.question.toLowerCase().includes(lowerQuery) ||
        f.answer.toLowerCase().includes(lowerQuery)
    ),
  };
}
```

---

## API Routes

### Chat Message Route

```typescript
// src/app/api/chat/[agentId]/messages/route.ts

import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { getAgent } from "@/lib/ai/agents/registry";
import { getToolsForAgent } from "@/lib/ai/tools/get-tools";
import { buildSystemPrompt } from "@/lib/ai/agents/build-system-prompt";
import { appDocumentation } from "@/lib/ai/docs/app-documentation";
import { resolveOrCreateChat, saveMessage } from "@/db/services/chat";
import { auth } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const { agentId } = params;

  const body = await request.json();
  const { messages, context, chatId, entityBinding } = body;

  // Get agent configuration
  const agent = getAgent(agentId);

  // Resolve or create chat
  const chat = await resolveOrCreateChat(userId, {
    chatId,
    entityBinding,
    agentId,
  });

  // Save user message
  const userMessage = messages[messages.length - 1];
  await saveMessage(userId, chat.id, userMessage);

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(agent, context, appDocumentation);

  // Get tools for this agent
  const tools = getToolsForAgent(agent, userId);

  // Stream response
  const result = await streamText({
    model: openai(agent.model.modelId),
    system: systemPrompt,
    messages,
    tools,
    temperature: agent.model.temperature,
    maxTokens: agent.model.maxTokens,
    onFinish: async ({ text, toolCalls, toolResults }) => {
      // Save assistant message
      await saveMessage(userId, chat.id, {
        role: "assistant",
        content: text,
        toolCalls,
        toolResults,
      });
    },
  });

  return result.toDataStreamResponse();
}
```

### Chat Resolution Route

```typescript
// src/app/api/chat/resolve/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveChat, getChatMessages } from "@/db/services/chat";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await request.json();

  const { type, entityType, entityId, chatId } = body;

  let resolvedChatId: string;
  let isNew = false;

  if (type === "entity-bound" && entityType && entityId) {
    // Find or create chat for entity
    const result = await resolveChat(userId, {
      entityType,
      entityId,
    });
    resolvedChatId = result.chatId;
    isNew = result.isNew;
  } else if (chatId) {
    // Use existing chat
    resolvedChatId = chatId;
  } else {
    // Create new standalone chat
    const result = await resolveChat(userId, {});
    resolvedChatId = result.chatId;
    isNew = true;
  }

  // Get messages
  const messages = isNew ? [] : await getChatMessages(userId, resolvedChatId);

  return NextResponse.json({
    chatId: resolvedChatId,
    messages,
    isNew,
  });
}
```

---

## Database Schema

### Extended Chat Schema

```typescript
// src/db/schema/chat.ts

import { pgTable, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const chats = pgTable(
  "chats",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Chat identification
    title: text("title"),

    // Agent used for this chat
    agentId: text("agent_id").notNull().default("korra-agent"),

    // Entity binding (null for standalone chats)
    boundEntityType: text("bound_entity_type"),
    boundEntityId: text("bound_entity_id"),

    // Status
    status: text("status").notNull().default("active"),

    // Timestamps
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

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    chatId: text("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Message content
    role: text("role").notNull(), // "user" | "assistant" | "system"
    content: text("content"),
    parts: jsonb("parts"), // For structured message parts

    // Tool calls (for assistant messages)
    toolCalls: jsonb("tool_calls"),
    toolResults: jsonb("tool_results"),

    // Metadata
    metadata: jsonb("metadata"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    chatIdIdx: index("messages_chat_id_idx").on(table.chatId),
    createdAtIdx: index("messages_created_at_idx").on(table.createdAt),
  })
);

// AI action audit log
export const aiActionLog = pgTable(
  "ai_action_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: text("chat_id")
      .references(() => chats.id, { onDelete: "set null" }),
    messageId: text("message_id")
      .references(() => messages.id, { onDelete: "set null" }),

    // Action details
    toolName: text("tool_name").notNull(),
    input: jsonb("input").notNull(),
    output: jsonb("output"),
    status: text("status").notNull(), // "success" | "error"
    errorMessage: text("error_message"),

    // Undo capability
    canUndo: text("can_undo").notNull().default("false"),
    undoAction: jsonb("undo_action"),
    undoneAt: timestamp("undone_at"),

    // Timestamps
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("ai_action_log_user_id_idx").on(table.userId),
    chatIdIdx: index("ai_action_log_chat_id_idx").on(table.chatId),
    createdAtIdx: index("ai_action_log_created_at_idx").on(table.createdAt),
  })
);
```

### Chat Service Functions

```typescript
// src/db/services/chat.ts

import { db } from "@/db";
import { chats, messages } from "@/db/schema/chat";
import { eq, and } from "drizzle-orm";
import { createId } from "@/lib/id";

interface ResolveOptions {
  chatId?: string;
  entityType?: string;
  entityId?: string;
  agentId?: string;
}

export async function resolveChat(
  userId: string,
  options: ResolveOptions
): Promise<{ chatId: string; isNew: boolean }> {
  // If entity-bound, look for existing chat
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

  // If chatId provided, verify it exists
  if (options.chatId) {
    const existing = await db.query.chats.findFirst({
      where: and(eq(chats.id, options.chatId), eq(chats.userId, userId)),
    });

    if (existing) {
      return { chatId: existing.id, isNew: false };
    }
  }

  // Create new chat
  const newChatId = createId("chat");
  await db.insert(chats).values({
    id: newChatId,
    userId,
    agentId: options.agentId || "korra-agent",
    boundEntityType: options.entityType || null,
    boundEntityId: options.entityId || null,
    status: "active",
  });

  return { chatId: newChatId, isNew: true };
}

export async function getChatMessages(userId: string, chatId: string) {
  const chat = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
  });

  if (!chat) {
    throw new Error("Chat not found");
  }

  const msgs = await db.query.messages.findMany({
    where: eq(messages.chatId, chatId),
    orderBy: (messages, { asc }) => [asc(messages.createdAt)],
  });

  return msgs.map(dbMessageToUIMessage);
}

export async function saveMessage(
  userId: string,
  chatId: string,
  message: {
    role: string;
    content?: string;
    parts?: unknown[];
    toolCalls?: unknown[];
    toolResults?: unknown[];
  }
) {
  const messageId = createId("msg");

  await db.insert(messages).values({
    id: messageId,
    chatId,
    userId,
    role: message.role,
    content: message.content,
    parts: message.parts,
    toolCalls: message.toolCalls,
    toolResults: message.toolResults,
  });

  // Update chat's updatedAt
  await db
    .update(chats)
    .set({ updatedAt: new Date() })
    .where(eq(chats.id, chatId));

  return messageId;
}

export async function getStandaloneChats(userId: string) {
  return db.query.chats.findMany({
    where: and(
      eq(chats.userId, userId),
      eq(chats.boundEntityType, null) // Standalone only
    ),
    orderBy: (chats, { desc }) => [desc(chats.updatedAt)],
  });
}

export async function getChatForEntity(
  userId: string,
  entityType: string,
  entityId: string
) {
  return db.query.chats.findFirst({
    where: and(
      eq(chats.userId, userId),
      eq(chats.boundEntityType, entityType),
      eq(chats.boundEntityId, entityId)
    ),
  });
}
```

---

## Complete Examples

### Example 1: Transaction List Page with AI

```typescript
// src/app/(protected)/transactions/page.tsx

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/ui/data-table";
import { AIQuickAction } from "@/components/ai/ai-quick-action";
import { useChatPageConfig } from "@/components/chat/chat-config-provider";
import { useRegisterToolHandler } from "@/components/chat/tool-handler-registry";
import { getTransactions } from "@/lib/api/transactions";

export default function TransactionsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const { data: transactions } = useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => getTransactions(filters),
  });

  // Provide view context to AI
  useChatPageConfig({
    context: {
      view: {
        selectedItems: selectedIds,
        currentFilters: filters,
        visibleData: {
          type: "transactions",
          count: transactions?.length || 0,
        },
      },
    },
  });

  // Register UI action handlers
  useRegisterToolHandler("set-filter", async (input: { filters: Record<string, unknown> }) => {
    setFilters(input.filters);
    return { applied: true };
  });

  useRegisterToolHandler("highlight-items", async (input: { itemIds: string[] }) => {
    setSelectedIds(input.itemIds);
    return { highlighted: input.itemIds.length };
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <AIQuickAction
          prompt="Summarize these transactions"
          label="AI Summary"
        />
      </div>

      <DataTable
        data={transactions || []}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        columns={[
          {
            id: "actions",
            cell: ({ row }) => (
              <div className="flex gap-1">
                <AIQuickAction
                  prompt="Explain this transaction"
                  context={{ transactionId: row.original.id }}
                  size="icon"
                />
                <AIQuickAction
                  prompt="Find similar transactions"
                  context={{ transactionId: row.original.id }}
                  size="icon"
                />
              </div>
            ),
          },
          // ... other columns
        ]}
      />
    </div>
  );
}
```

### Example 2: BDX Setup with Sheet Tools

```typescript
// src/app/(protected)/bdx-setup/page.tsx

"use client";

import { useState, useRef, useMemo } from "react";
import { useChatPageConfig } from "@/components/chat/chat-config-provider";
import { useRegisterToolHandler } from "@/components/chat/tool-handler-registry";
import { UniversSheet, type SheetRef } from "@/components/sheets/univers-sheet";
import { FileUploader } from "@/components/ui/file-uploader";
import { createId } from "@/lib/id";

export default function BdxSetupPage() {
  const [file, setFile] = useState<File | null>(null);
  const sheetRef = useRef<SheetRef>(null);

  const sessionId = useMemo(() => createId("bdx"), []);

  // Configure chat for BDX setup
  useChatPageConfig({
    agentId: "bdx-setup",
    entityBinding: {
      type: "bdx-setup",
      id: sessionId,
    },
    context: {
      fileInfo: file ? { name: file.name, size: file.size } : null,
    },
  });

  // Register sheet tools
  useRegisterToolHandler("get-sheet-names", async () => {
    if (!sheetRef.current) return { sheets: [] };
    return { sheets: sheetRef.current.getSheetNames() };
  });

  useRegisterToolHandler("read-sheet-cell", async (input: { sheet: string; cell: string }) => {
    if (!sheetRef.current) return { value: null };
    const value = sheetRef.current.getCellValue(input.sheet, input.cell);
    return { value };
  });

  useRegisterToolHandler("read-sheet-range", async (input: { sheet: string; range: string }) => {
    if (!sheetRef.current) return { values: [] };
    const values = sheetRef.current.getRangeValues(input.sheet, input.range);
    return { values };
  });

  useRegisterToolHandler("select-range", async (input: { sheet: string; range: string }) => {
    if (!sheetRef.current) return { selected: false };
    sheetRef.current.selectRange(input.sheet, input.range);
    return { selected: true };
  });

  useRegisterToolHandler("highlight-cells", async (input: { sheet: string; cells: string[] }) => {
    if (!sheetRef.current) return { highlighted: false };
    sheetRef.current.highlightCells(input.sheet, input.cells);
    return { highlighted: true };
  });

  useRegisterToolHandler("scroll-to-cell", async (input: { sheet: string; cell: string }) => {
    if (!sheetRef.current) return { scrolled: false };
    sheetRef.current.scrollToCell(input.sheet, input.cell);
    return { scrolled: true };
  });

  return (
    <div className="h-full flex flex-col">
      {!file ? (
        <FileUploader
          accept=".xlsx,.xls,.csv"
          onUpload={setFile}
        />
      ) : (
        <UniversSheet
          ref={sheetRef}
          file={file}
        />
      )}
    </div>
  );
}
```

### Example 3: Help Page Using App Documentation

```typescript
// src/app/(protected)/help/page.tsx

"use client";

import { useState } from "react";
import { appDocumentation, searchDocs } from "@/lib/ai/docs/app-documentation";
import { Input } from "@/components/ui/input";
import { AIQuickAction } from "@/components/ai/ai-quick-action";

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const searchResults = searchQuery
    ? searchDocs(appDocumentation, searchQuery)
    : null;

  const displayedRoutes = searchResults?.routes || appDocumentation.routes;
  const displayedFaqs = searchResults?.faqs || appDocumentation.faqs;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Help & Documentation</h1>
        <AIQuickAction
          prompt="Help me find what I'm looking for"
          label="Ask AI"
        />
      </div>

      <Input
        placeholder="Search documentation..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="mb-8"
      />

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Pages</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {displayedRoutes.map((route) => (
            <div key={route.path} className="border rounded-lg p-4">
              <h3 className="font-medium">{route.name}</h3>
              <p className="text-sm text-muted-foreground">{route.description}</p>
              <ul className="mt-2 text-sm">
                {route.features.slice(0, 3).map((feature, i) => (
                  <li key={i}>• {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {displayedFaqs.map((faq, i) => (
            <div key={i} className="border rounded-lg p-4">
              <h3 className="font-medium">{faq.question}</h3>
              <p className="text-sm text-muted-foreground mt-2">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Glossary</h2>
        <div className="grid gap-2">
          {appDocumentation.glossary.map((entry) => (
            <div key={entry.term} className="flex gap-2">
              <span className="font-medium">{entry.term}:</span>
              <span className="text-muted-foreground">{entry.definition}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

---

## Summary

This implementation guide provides:

1. **Complete component hierarchy** for chat and AI integration
2. **Layout-level chat orchestration** with page-level configuration
3. **Tool handler registry** for client-side tool execution
4. **Three types of tools**: server-side, client-side, and UI actions
5. **Context system** for route, view, and page-specific data
6. **Agent configuration** with per-agent tools and prompts
7. **Application documentation** structure that serves both AI and Help section
8. **Database schema** for chats, messages, and AI action audit
9. **API routes** for chat resolution and message handling
10. **Complete examples** for different page types

The key principle is that AI should be a first-class citizen throughout the application, not just a sidebar utility. This architecture enables:

- Chat always available from any page
- AI understands what the user is looking at
- AI can take actions (server and client-side)
- AI can control the UI (navigate, filter, highlight)
- AI knows the application (documentation)
- All AI actions are tracked and auditable
