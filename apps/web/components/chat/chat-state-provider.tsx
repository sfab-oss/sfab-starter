"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { apiClient } from "@/lib/api-client";
import { createId } from "@/lib/utils";
import type { AIUIMessage } from "@/types/ai";

const COOKIE_NAME = "active_chat_id";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function setCookie(name: string, value: string, maxAge: number) {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not widely supported
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}`;
}

interface ChatStateContextValue {
  currentChatId: string;
  isNewChat: boolean;
  initialMessages: AIUIMessage[];
  startNewChat: () => void;
  navigateToChat: (chatId: string) => Promise<void>;
  markChatPersisted: () => void;
}

const ChatStateContext = createContext<ChatStateContextValue | null>(null);

export function useChatState() {
  const context = useContext(ChatStateContext);
  if (!context) {
    throw new Error("useChatState must be used within a <ChatStateProvider />");
  }
  return context;
}

interface ChatStateProviderProps {
  children: ReactNode;
  defaultChatId?: string;
  defaultMessages?: AIUIMessage[];
  defaultIsNewChat?: boolean;
}

export function ChatStateProvider({
  children,
  defaultChatId,
  defaultMessages = [],
  defaultIsNewChat = true,
}: ChatStateProviderProps) {
  const [currentChatId, setCurrentChatId] = useState<string>(
    () => defaultChatId || createId("chat")
  );
  const [isNewChat, setIsNewChat] = useState<boolean>(defaultIsNewChat);
  const [initialMessages, setInitialMessages] =
    useState<AIUIMessage[]>(defaultMessages);

  const startNewChat = useCallback(() => {
    const newChatId = createId("chat");
    setCurrentChatId(newChatId);
    setIsNewChat(true);
    setInitialMessages([]);
  }, []);

  const navigateToChat = useCallback(async (chatId: string) => {
    const response = await apiClient.api.chat[":chatId"].$get({
      param: { chatId },
    });
    const data = await response.json();

    if (!response.ok || "error" in data) {
      throw new Error("Failed to fetch chat");
    }

    const messages = (data.messages as AIUIMessage[]) || [];

    setCurrentChatId(chatId);
    setIsNewChat(false);
    setInitialMessages(messages);
    // Set cookie for session restoration
    setCookie(COOKIE_NAME, chatId, COOKIE_MAX_AGE);
  }, []);

  const markChatPersisted = useCallback(() => {
    setIsNewChat(false);
    // Set cookie only after chat is persisted (first message sent)
    setCookie(COOKIE_NAME, currentChatId, COOKIE_MAX_AGE);
  }, [currentChatId]);

  const value = useMemo(
    () => ({
      currentChatId,
      isNewChat,
      initialMessages,
      startNewChat,
      navigateToChat,
      markChatPersisted,
    }),
    [
      currentChatId,
      isNewChat,
      initialMessages,
      startNewChat,
      navigateToChat,
      markChatPersisted,
    ]
  );

  return (
    <ChatStateContext.Provider value={value}>
      {children}
    </ChatStateContext.Provider>
  );
}
