import { useAgentChat } from "@cloudflare/ai-chat/react";
import { useAgent } from "agents/react";
import type { ChatStatus } from "ai";
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

interface ChatWindowValue {
  chatId: string | null;
  /** Force-summarize older history. Defined only while connected. */
  compact?: () => Promise<{ compacted: boolean }>;
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

interface ChatConnectionValue {
  helpers: ChatHelpers;
}

// Nested context so the lifted `ChatWindowContext` doesn't re-render on
// every helpers identity change. Consumers must live inside `<ChatConnection>`.
const ChatConnectionContext = createContext<ChatConnectionValue | null>(null);

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
    return undefined;
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

  // Pinned the first time we observe a chatId AND a pending together (the
  // in-session draft→real upgrade). Sticky so when `pending` clears after
  // the first send, the late re-render doesn't switch
  // `getInitialMessages` back to `undefined` and trigger a second
  // Suspense flash via `GET /get-messages`.
  const skipInitialFetchRef = useRef(false);
  if (chatId !== null && pending !== null && !skipInitialFetchRef.current) {
    skipInitialFetchRef.current = true;
  }

  const [isConnected, setIsConnected] = useState(false);
  const [helperStatus, setHelperStatus] = useState<ChatStatus>("ready");
  const [helperMessages, setHelperMessages] = useState<OrgChatMessage[]>([]);
  const helpersRef = useRef<ChatHelpers | null>(null);
  // Set by <ChatConnection> (which owns the agent stub) so the composer's
  // context chip can trigger compaction without reaching into the connection.
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
  const handleIsConnected = useCallback((c: boolean) => setIsConnected(c), []);

  const handleSendError = useCallback(
    (err: string) => {
      useChatTabsStore.getState().setSendError(organizationId, tabKey, err);
    },
    [organizationId, tabKey]
  );

  const handleClearPending = useCallback(() => {
    useChatTabsStore.getState().clearPending(organizationId, tabKey);
  }, [organizationId, tabKey]);

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
        // chatId flipped but <ChatConnection> hasn't committed yet —
        // queue via pending and let the drain effect pick it up.
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
    // Connected case: re-arm the drain effect with a fresh pending
    // object reference. The drain dedups by identity (lastSentRef ===
    // pending), so the new reference is what makes it re-fire.
    const store = useChatTabsStore.getState();
    store.setPending(organizationId, tabKey, { ...pending });
    store.clearSendError(organizationId, tabKey);
  }, [chatId, pending, organizationId, tabKey, runDraftCreate]);

  // While `pending` is set, lock the spinner to "submitted" so the
  // create→connect→send chain reads as one continuous gesture. Once the
  // SDK status moves past "ready" (sendMessage engaged), defer to it so
  // streaming surfaces correctly. The naive `isConnected → helperStatus`
  // branch flickers back to "ready" between <ChatConnection> committing
  // and the drain effect firing.
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

  // Gated whenever a pending hasn't drained (a new keystroke would
  // overwrite it) or we're still suspending on initial history load.
  // Concurrent submits over an established connection are fine — the SDK
  // queues them.
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
              onIsConnected={handleIsConnected}
              onMessages={handleMessages}
              onRetry={handleRetry}
              onSendError={handleSendError}
              onStatus={handleStatus}
              pending={pending}
              sendError={sendError}
              skipInitialFetch={skipInitialFetchRef.current}
            />
          )}
        </Suspense>
        {showInputPlaceholder ? (
          <ChatInputPlaceholder />
        ) : (
          <ChatInput
            disabled={composerDisabled}
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
  onIsConnected: (c: boolean) => void;
  onMessages: (m: OrgChatMessage[]) => void;
  onRetry: () => void;
  onSendError: (err: string) => void;
  onStatus: (s: ChatStatus) => void;
  pending: OutgoingMessage | null;
  sendError: string | null;
  skipInitialFetch: boolean;
}

function ChatConnection({
  chatId,
  compactRef,
  helpersRef,
  onClearPending,
  onIsConnected,
  onMessages,
  onRetry,
  onSendError,
  onStatus,
  pending,
  sendError,
  skipInitialFetch,
}: ChatConnectionProps) {
  const { organizationId } = useChatOrgConnection();

  const chatAgent = useAgent({
    agent: "OrgAgent",
    name: organizationId,
    sub: [{ agent: "OrgChat", name: chatId }],
  });

  // Expose the facet's `compactNow` @callable to the composer's context chip.
  compactRef.current = () =>
    chatAgent.call("compactNow", []) as Promise<{ compacted: boolean }>;

  const helpers = useAgentChat<unknown, OrgChatMessage>({
    agent: chatAgent,
    // `null` skips the library's `use(GET /get-messages)`-driven
    // suspense — safe for chats this panel just created, which are
    // empty on the server by construction.
    getInitialMessages: skipInitialFetch ? null : undefined,
  });

  helpersRef.current = helpers;

  useEffect(() => {
    onStatus(helpers.status);
  }, [helpers.status, onStatus]);

  useEffect(() => {
    onMessages(helpers.messages);
  }, [helpers.messages, onMessages]);

  useEffect(() => {
    onIsConnected(true);
    return () => onIsConnected(false);
  }, [onIsConnected]);

  // `lastSentRef` blocks re-firing for the same pending after streaming
  // returns status to "ready", and survives strict-mode remount so the
  // initial send doesn't double-fire. Retry breaks the dedup by handing
  // us a fresh pending reference, not by resetting this ref.
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

  return (
    <ChatConnectionContext.Provider value={{ helpers }}>
      <ChatMessages
        helpers={helpers}
        onRetry={onRetry}
        pending={pending}
        sendError={sendError}
      />
    </ChatConnectionContext.Provider>
  );
}
