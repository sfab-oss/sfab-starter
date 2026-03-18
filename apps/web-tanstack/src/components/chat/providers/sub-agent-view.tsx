import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

interface SubAgentViewContextValue {
  /** The child chat ID currently being viewed, or null if viewing parent */
  viewingChildChatId: string | null;
  /** Switch to viewing a child chat thread */
  viewChildChat: (chatId: string) => void;
  /** Return to the parent chat view */
  returnToParent: () => void;
}

const SubAgentViewContext = createContext<SubAgentViewContextValue | null>(
  null
);

export function useSubAgentView() {
  const context = useContext(SubAgentViewContext);
  if (!context) {
    throw new Error(
      "useSubAgentView must be used within a <SubAgentViewProvider />"
    );
  }
  return context;
}

export function SubAgentViewProvider({ children }: { children: ReactNode }) {
  const [viewingChildChatId, setViewingChildChatId] = useState<string | null>(
    null
  );

  const viewChildChat = useCallback((chatId: string) => {
    setViewingChildChatId(chatId);
  }, []);

  const returnToParent = useCallback(() => {
    setViewingChildChatId(null);
  }, []);

  return (
    <SubAgentViewContext.Provider
      value={{ viewingChildChatId, viewChildChat, returnToParent }}
    >
      {children}
    </SubAgentViewContext.Provider>
  );
}
