import type { ChatContext } from "@workspace/types/ai";
import { createContext, useContext, useMemo, useRef, useState } from "react";

interface ChatPageConfigContextValue {
  pageConfig: ChatContext["page"] | undefined;
  setPageConfig: (config: ChatContext["page"] | undefined) => void;
}

const ChatPageConfigContext = createContext<
  ChatPageConfigContextValue | undefined
>(undefined);

export function ChatPageConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageConfig, setPageConfig] = useState<ChatContext["page"] | undefined>(
    undefined
  );

  const value = useMemo(() => ({ pageConfig, setPageConfig }), [pageConfig]);

  return (
    <ChatPageConfigContext.Provider value={value}>
      {children}
    </ChatPageConfigContext.Provider>
  );
}

export function useChatPageConfig(config: ChatContext["page"]) {
  const context = useContext(ChatPageConfigContext);
  const configRef = useRef(config);
  const isFirstRender = useRef(true);

  if (!context) {
    throw new Error(
      "useChatPageConfig must be used within ChatPageConfigProvider"
    );
  }

  useMemo(() => {
    if (JSON.stringify(configRef.current) !== JSON.stringify(config)) {
      context.setPageConfig(config);
      configRef.current = config;
    }
  }, [context, config]);

  useState(() => {
    return () => {
      if (!isFirstRender.current) {
        context.setPageConfig(undefined);
      }
      isFirstRender.current = false;
    };
  });
}

export function useCurrentPageConfig(): ChatContext["page"] | undefined {
  const context = useContext(ChatPageConfigContext);
  return context?.pageConfig;
}
