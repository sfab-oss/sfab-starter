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

interface ChatSessionContextValue {
  currentChatId: string;
  isNewChat: boolean;
  initialMessages: AIUIMessage[];
  startNewChat: () => void;
  navigateToChat: (chatId: string) => void;
  markChatPersisted: () => void;
}

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

export function useChatSession() {
  const context = useContext(ChatSessionContext);
  if (!context) {
    throw new Error(
      "useChatSession must be used within a <ChatSessionProvider />"
    );
  }
  return context;
}

interface ChatSessionProviderProps {
  children: ReactNode;
  defaultChatId?: string;
  defaultMessages?: AIUIMessage[];
  defaultIsNewChat?: boolean;
}

export function ChatSessionProvider({
  children,
  defaultChatId,
  defaultMessages = [],
  defaultIsNewChat = true,
}: ChatSessionProviderProps) {
  const navigate = useNavigate();

  const currentChatId = useState<string>(
    () => defaultChatId || createId("chat")
  )[0];
  const [isNewChat, setIsNewChat] = useState<boolean>(defaultIsNewChat);
  const [initialMessages] = useState<AIUIMessage[]>(defaultMessages);

  const startNewChat = useCallback(() => {
    navigate({ to: "/chat" });
  }, [navigate]);

  const navigateToChat = useCallback(
    (chatId: string) => {
      navigate({ to: "/chat/$id", params: { id: chatId } });
    },
    [navigate]
  );

  const markChatPersisted = useCallback(() => {
    setIsNewChat(false);
  }, []);

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
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
}
