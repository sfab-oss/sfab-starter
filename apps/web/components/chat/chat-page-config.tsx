"use client";

import type { ChatContext } from "@workspace/types/ai";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PageConfig = ChatContext["page"];

interface ChatPageConfigContextValue {
  pageConfig: PageConfig | undefined;
  setPageConfig: (config: PageConfig | undefined) => void;
}

const ChatPageConfigContext = createContext<
  ChatPageConfigContextValue | undefined
>(undefined);

export function ChatPageConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageConfig, setPageConfig] = useState<PageConfig | undefined>(
    undefined
  );

  const value = useMemo(() => ({ pageConfig, setPageConfig }), [pageConfig]);

  return (
    <ChatPageConfigContext.Provider value={value}>
      {children}
    </ChatPageConfigContext.Provider>
  );
}

/**
 * Hook for pages to set their context configuration.
 * Call this in any page component to provide context to the AI.
 *
 * @example
 * ```tsx
 * function TransactionSetupPage({ params }: { params: { id: string } }) {
 *   useChatPageConfig({
 *     title: "Transaction Setup",
 *     entityType: "transaction-setup",
 *     entityId: params.id,
 *   });
 *
 *   return <TransactionSetupForm />;
 * }
 * ```
 */
export function useChatPageConfig(config: PageConfig) {
  const context = useContext(ChatPageConfigContext);
  const configRef = useRef(config);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    // Only update if config actually changed
    if (JSON.stringify(configRef.current) !== JSON.stringify(config)) {
      context?.setPageConfig(config);
      configRef.current = config;
    }

    return () => {
      // Only clear on actual unmount, not re-render
      if (!isFirstRender.current) {
        context?.setPageConfig(undefined);
      }
      isFirstRender.current = false;
    };
  }, [context, config]);
}

/**
 * Hook for ChatInput to read the current page configuration.
 * Returns undefined if no page has set a configuration.
 */
export function useCurrentPageConfig(): PageConfig | undefined {
  const context = useContext(ChatPageConfigContext);
  return context?.pageConfig;
}
