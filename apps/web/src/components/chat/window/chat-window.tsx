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

  const skipInitialFetchRef = useRef(false);
  if (chatId !== null && pending !== null && !skipInitialFetchRef.current) {
    skipInitialFetchRef.current = true;
  }

  const [isConnected, setIsConnected] = useState(false);
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

  compactRef.current = () =>
    chatAgent.call("compactNow", []) as Promise<{ compacted: boolean }>;

  const helpers = useAgentChat<unknown, OrgChatMessage>({
    agent: chatAgent,
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
