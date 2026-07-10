// ALW-401 AC-5 — the chat hook is `@cloudflare/think/react`, not the generic
// `@cloudflare/ai-chat/react` re-export. OrgChat *is* a Think agent, so we use
// the Think-tuned `useAgentChat`: it forces `syncMessagesToServer: false`
// (Think's Session tree is server-authoritative — the client never pushes a
// transcript; `setMessages` is local-only) and adds connection/streaming
// signals (`isRecovering`, `connectionError`, `isServerStreaming`). It's a
// per-connection hook — one per chat tab — so it composes cleanly with our
// multi-session, single-shared-workspace model (the workspace is owned by the
// parent OrgAgent and reached via the separate org connection, not this hook).
import { useAgentChat } from "@cloudflare/think/react";
import type { AIDataPart } from "@workspace/contract/ai";
import type { AgentToolRunState } from "agents/agent-tools";
import { useAgent, useAgentToolEvents } from "agents/react";
import type { ChatStatus, UIMessagePart, UITools } from "ai";
import {
  createContext,
  type MutableRefObject,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useChatOrgConnection } from "@/components/chat/connection/chat-org-connection";
import {
  type ChatHelpers,
  type OrgChatMessage,
  type OutgoingMessage,
  type TabEntry,
  toSendableMessage,
  useChatTabsStore,
  useTab,
} from "@/components/chat/dock/chat-tabs-store";
import { ChatContent } from "@/components/chat/parts/chat-content";
import { ChatHeader } from "@/components/chat/parts/chat-header";
import { ChatInput } from "@/components/chat/parts/chat-input";
import {
  ChatMessages,
  MessagesAreaSkeleton,
} from "@/components/chat/parts/chat-messages";
import { ChatInputPlaceholder } from "@/components/chat/placeholders";

/**
 * Real WebSocket connection state, driven by the `useAgent` socket lifecycle
 * (`onOpen`/`onClose`/`onConnectionError`) rather than React mount lifecycle.
 * `"connecting"` covers both the first connect and an auto-reconnect after a
 * transient drop; `"disconnected"` is a terminal close that won't reconnect.
 */
export type ChatConnectionStatus = "connecting" | "connected" | "disconnected";

interface ChatWindowValue {
  chatId: string | null;
  compact?: () => Promise<{ compacted: boolean }>;
  connectionStatus: ChatConnectionStatus;
  isConnected: boolean;
  messages: OrgChatMessage[];
  onRetry: () => void;
  pending: OutgoingMessage | null;
  sendError: string | null;
  status: ChatStatus;
  tabKey: string;
}

const ChatWindowContext = createContext<ChatWindowValue | null>(null);

export function useChatWindow() {
  const ctx = useContext(ChatWindowContext);
  if (!ctx) {
    throw new Error("useChatWindow must be used within a <ChatWindow />");
  }
  return ctx;
}

/**
 * A part of a delegated sub-agent's transcript, typed with our data-part union
 * so `<MessagePart>` can render a child run's parts exactly like a top-level
 * message (text, reasoning, and its own read-only tool cards). (ALW-401)
 */
export type SubAgentPart = UIMessagePart<AIDataPart, UITools>;
export type SubAgentRun = AgentToolRunState<SubAgentPart>;

interface ChatConnectionValue {
  helpers: ChatHelpers;
  /**
   * Live sub-agent runs spawned by a `delegate` tool call in this chat, keyed by
   * the tool-call id, folded from the parent socket's `agent-tool-event` stream
   * (`useAgentToolEvents`) — no extra connection. Drives the inline `DelegateRun`
   * card; replay-durable across reconnect. Empty until the child starts.
   */
  getSubAgentRuns: (toolCallId: string) => SubAgentRun[];
  /** RPC into the OrgChat facet (Think `@callable`s). */
  callAgent: (method: string, args?: unknown[]) => Promise<unknown>;
}

export const ChatConnectionContext = createContext<ChatConnectionValue | null>(
  null
);

export function useChatConnection() {
  const ctx = useContext(ChatConnectionContext);
  if (!ctx) {
    throw new Error("useChatConnection must be used inside <ChatConnection />");
  }
  return ctx;
}

export interface ChatWindowProps {
  tabKey: string;
}

export function ChatWindow({ tabKey }: ChatWindowProps) {
  const { organizationId } = useChatOrgConnection();
  const tab = useTab(organizationId, tabKey);
  if (!tab) {
    return null;
  }
  return <ChatWindowInner tab={tab} tabKey={tabKey} />;
}

function deriveTitleFromMessage(message: OutgoingMessage): string | undefined {
  const text = message.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { text: string }).text)
    .join(" ")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) {
    return;
  }
  return text.length > 50 ? `${text.slice(0, 47).trim()}…` : text;
}

function errorMessageFrom(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error) {
    return error;
  }
  return "Couldn't send your message. Please try again.";
}

function ChatWindowInner({ tab, tabKey }: { tab: TabEntry; tabKey: string }) {
  const { organizationId, createChat } = useChatOrgConnection();
  const { chatId, pending, sendError } = tab;

  const [connectionStatus, setConnectionStatus] =
    useState<ChatConnectionStatus>("connecting");
  const isConnected = connectionStatus === "connected";
  const [helperStatus, setHelperStatus] = useState<ChatStatus>("ready");
  const [helperMessages, setHelperMessages] = useState<OrgChatMessage[]>([]);
  const helpersRef = useRef<ChatHelpers | null>(null);
  const compactRef = useRef<(() => Promise<{ compacted: boolean }>) | null>(
    null
  );
  const compact = useCallback(() => {
    const fn = compactRef.current;
    return fn ? fn() : Promise.resolve({ compacted: false });
  }, []);

  const handleStatus = useCallback((s: ChatStatus) => setHelperStatus(s), []);
  const handleMessages = useCallback(
    (m: OrgChatMessage[]) => setHelperMessages(m),
    []
  );
  const handleConnectionStatus = useCallback(
    (s: ChatConnectionStatus) => setConnectionStatus(s),
    []
  );

  const handleSendError = useCallback(
    (err: string) => {
      useChatTabsStore.getState().setSendError(organizationId, tabKey, err);
    },
    [organizationId, tabKey]
  );

  const handleClearPending = useCallback(() => {
    useChatTabsStore.getState().clearPending(organizationId, tabKey);
  }, [organizationId, tabKey]);

  // Cancel an in-flight streaming turn (the composer shows a stop icon while
  // streaming; the reference client wires it to `helpers.stop()`).
  const handleStop = useCallback(() => {
    helpersRef.current?.stop();
  }, []);

  const runDraftCreate = useCallback(
    async (message: OutgoingMessage) => {
      const store = useChatTabsStore.getState();
      store.setPending(organizationId, tabKey, message);
      store.clearSendError(organizationId, tabKey);
      try {
        const title = deriveTitleFromMessage(message);
        const chat = await createChat(title ? { title } : undefined);
        if (!chat) {
          throw new Error("createChat returned no chat");
        }
        useChatTabsStore
          .getState()
          .upgradeTab(organizationId, tabKey, chat.id, chat.title);
      } catch (error) {
        console.error("[ChatWindow] createChat failed", error);
        useChatTabsStore
          .getState()
          .setSendError(organizationId, tabKey, errorMessageFrom(error));
      }
    },
    [createChat, organizationId, tabKey]
  );

  const handleSubmit = useCallback(
    async (message: OutgoingMessage) => {
      if (chatId === null) {
        await runDraftCreate(message);
        return;
      }
      const helpers = helpersRef.current;
      if (!helpers) {
        useChatTabsStore.getState().setPending(organizationId, tabKey, message);
        return;
      }
      await helpers.sendMessage(toSendableMessage(message));
    },
    [chatId, organizationId, tabKey, runDraftCreate]
  );

  const handleRetry = useCallback(() => {
    if (!pending) {
      useChatTabsStore.getState().clearSendError(organizationId, tabKey);
      return;
    }
    if (chatId === null) {
      runDraftCreate(pending).catch((error) => {
        console.error("[ChatWindow] retry draft create failed", error);
      });
      return;
    }
    const store = useChatTabsStore.getState();
    store.setPending(organizationId, tabKey, { ...pending });
    store.clearSendError(organizationId, tabKey);
  }, [chatId, pending, organizationId, tabKey, runDraftCreate]);

  let composerStatus: ChatStatus;
  if (sendError !== null && pending !== null) {
    composerStatus = "error";
  } else if (pending !== null) {
    composerStatus = helperStatus === "ready" ? "submitted" : helperStatus;
  } else if (isConnected) {
    composerStatus = helperStatus;
  } else {
    composerStatus = "ready";
  }

  const composerDisabled =
    pending !== null || (chatId !== null && !isConnected);

  const placeholder =
    chatId === null
      ? "Start a new conversation..."
      : "Ask anything about your organization...";

  const showInputPlaceholder =
    chatId !== null && !isConnected && pending === null;

  const value: ChatWindowValue = {
    chatId,
    compact: isConnected ? compact : undefined,
    connectionStatus,
    isConnected,
    messages: helperMessages,
    onRetry: handleRetry,
    pending,
    sendError,
    status: composerStatus,
    tabKey,
  };

  return (
    <ChatWindowContext.Provider value={value}>
      <ChatContent>
        <ChatHeader />
        <Suspense fallback={<MessagesAreaSkeleton />}>
          {chatId === null ? (
            <ChatMessages
              helpers={null}
              onRetry={handleRetry}
              pending={pending}
              sendError={sendError}
            />
          ) : (
            <ChatConnection
              chatId={chatId}
              compactRef={compactRef}
              helpersRef={helpersRef}
              onClearPending={handleClearPending}
              onConnectionStatus={handleConnectionStatus}
              onMessages={handleMessages}
              onRetry={handleRetry}
              onSendError={handleSendError}
              onStatus={handleStatus}
              pending={pending}
              sendError={sendError}
            />
          )}
        </Suspense>
        {showInputPlaceholder ? (
          <ChatInputPlaceholder
            note={
              connectionStatus === "disconnected"
                ? "Connection lost — reload the page to reconnect."
                : "Connecting…"
            }
          />
        ) : (
          <ChatInput
            disabled={composerDisabled}
            onStop={handleStop}
            onSubmit={async (message) => {
              await handleSubmit(message);
            }}
            placeholder={placeholder}
            status={composerStatus}
          />
        )}
      </ChatContent>
    </ChatWindowContext.Provider>
  );
}

interface ChatConnectionProps {
  chatId: string;
  compactRef: MutableRefObject<(() => Promise<{ compacted: boolean }>) | null>;
  helpersRef: MutableRefObject<ChatHelpers | null>;
  onClearPending: () => void;
  onConnectionStatus: (s: ChatConnectionStatus) => void;
  onMessages: (m: OrgChatMessage[]) => void;
  onRetry: () => void;
  onSendError: (err: string) => void;
  onStatus: (s: ChatStatus) => void;
  pending: OutgoingMessage | null;
  sendError: string | null;
}

function ChatConnection({
  chatId,
  compactRef,
  helpersRef,
  onClearPending,
  onConnectionStatus,
  onMessages,
  onRetry,
  onSendError,
  onStatus,
  pending,
  sendError,
}: ChatConnectionProps) {
  const { organizationId } = useChatOrgConnection();

  // Real WebSocket lifecycle → connection status. `onClose` maps to
  // "connecting" (the agents client auto-reconnects on a transient drop); a
  // terminal close that won't reconnect surfaces via `chatAgent.connectionError`
  // below.
  const handleSocketOpen = useCallback(
    () => onConnectionStatus("connected"),
    [onConnectionStatus]
  );
  const handleSocketClose = useCallback(
    () => onConnectionStatus("connecting"),
    [onConnectionStatus]
  );

  const chatAgent = useAgent({
    agent: "OrgAgent",
    name: organizationId,
    sub: [{ agent: "OrgChat", name: chatId }],
    onOpen: handleSocketOpen,
    onClose: handleSocketClose,
  });

  compactRef.current = () =>
    chatAgent.call("compactNow", []) as Promise<{ compacted: boolean }>;

  const helpers = useAgentChat<unknown, OrgChatMessage>({
    agent: chatAgent,
    // `null` disables the hook's HTTP `/get-messages` fetch — Think hydrates the
    // transcript over the WebSocket on connect (`cf_agent_chat_messages`), so an
    // HTTP fetch would be a redundant round-trip. It's also the resume-safe path:
    // the server *withholds* that broadcast while a turn is resuming so it can't
    // clobber the assistant message the client is rebuilding from the resume
    // stream. This matches the Think reference client. (ALW-401)
    getInitialMessages: null,
    // Coalesce streaming token updates (matches the Think reference client) so
    // a fast stream doesn't re-render the message list on every delta.
    experimental_throttle: 100,
  });

  helpersRef.current = helpers;

  // Fold the parent socket's `agent-tool-event` frames into per-run state for
  // the inline sub-agent card. Reuses this same WebSocket — no child connection.
  const subAgentEvents = useAgentToolEvents<SubAgentPart>({ agent: chatAgent });
  const getSubAgentRuns = (toolCallId: string) =>
    subAgentEvents.getRunsForToolCall(toolCallId);

  useEffect(() => {
    onStatus(helpers.status);
  }, [helpers.status, onStatus]);

  useEffect(() => {
    onMessages(helpers.messages);
  }, [helpers.messages, onMessages]);

  // Reconcile from the hook's reactive fields: `identified` covers the
  // already-open case (a tab switch can remount this view without re-firing
  // `onOpen`), and a non-null `connectionError` is a terminal disconnect.
  const { connectionError, identified } = chatAgent;
  // Before the socket is identified we haven't received the on-connect
  // transcript broadcast yet — show the skeleton (not an empty state) so a
  // reload of a chat-with-history doesn't flash "no messages" first. Now that
  // `getInitialMessages` is `null` there's no Suspense fallback to cover this.
  const isHydrating = !(identified || connectionError);
  useEffect(() => {
    if (connectionError) {
      onConnectionStatus("disconnected");
    } else if (identified) {
      onConnectionStatus("connected");
    }
  }, [connectionError, identified, onConnectionStatus]);

  // Dedup pending sends by object identity; survives strict-mode remount.
  const lastSentRef = useRef<OutgoingMessage | null>(null);
  const sendMessage = helpers.sendMessage;
  useEffect(() => {
    if (!pending || helpers.status !== "ready" || sendError !== null) {
      return;
    }
    if (lastSentRef.current === pending) {
      return;
    }
    lastSentRef.current = pending;
    sendMessage(toSendableMessage(pending))
      .then(() => {
        onClearPending();
      })
      .catch((error: unknown) => {
        console.error("[ChatConnection] sendMessage failed", error);
        lastSentRef.current = null;
        onSendError(errorMessageFrom(error));
      });
  }, [
    pending,
    helpers.status,
    sendError,
    sendMessage,
    onClearPending,
    onSendError,
  ]);

  const callAgent = useCallback(
    (method: string, args: unknown[] = []) =>
      chatAgent.call(method, args) as Promise<unknown>,
    [chatAgent]
  );

  return (
    <ChatConnectionContext.Provider
      value={{ helpers, getSubAgentRuns, callAgent }}
    >
      <ChatMessages
        helpers={helpers}
        isHydrating={isHydrating}
        onRetry={onRetry}
        pending={pending}
        sendError={sendError}
      />
    </ChatConnectionContext.Provider>
  );
}
