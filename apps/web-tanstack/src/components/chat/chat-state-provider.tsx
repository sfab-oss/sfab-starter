import { useNavigate } from "@tanstack/react-router";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
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
  navigateToChat: (chatId: string) => void;
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
  const navigate = useNavigate();

  const currentChatId = useState<string>(
    () => defaultChatId || createId("chat")
  )[0];
  const [isNewChat, setIsNewChat] = useState<boolean>(defaultIsNewChat);
  const [initialMessages] = useState<AIUIMessage[]>(defaultMessages);

  const startNewChat = useCallback(() => {
    const newChatId = createId("chat");
    setCookie(COOKIE_NAME, newChatId, COOKIE_MAX_AGE);
    navigate({ to: "/chat/$id", params: { id: newChatId } });
  }, [navigate]);

  const navigateToChat = useCallback(
    (chatId: string) => {
      setCookie(COOKIE_NAME, chatId, COOKIE_MAX_AGE);
      navigate({ to: "/chat/$id", params: { id: chatId } });
    },
    [navigate]
  );

  const markChatPersisted = useCallback(() => {
    setIsNewChat(false);
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
