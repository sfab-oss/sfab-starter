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

interface PageContextValue {
  pageConfig: PageConfig | undefined;
  setPageConfig: (config: PageConfig | undefined) => void;
}

const PageContextContext = createContext<PageContextValue | undefined>(
  undefined
);

export function PageContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageConfig, setPageConfig] = useState<PageConfig | undefined>(
    undefined
  );

  const value = useMemo(() => ({ pageConfig, setPageConfig }), [pageConfig]);

  return (
    <PageContextContext.Provider value={value}>
      {children}
    </PageContextContext.Provider>
  );
}

/**
 * Hook for pages to set their context configuration.
 * Call this in any page component to provide context to the AI.
 *
 * @example
 * ```tsx
 * function WarehouseSetupPage({ params }: { params: { id: string } }) {
 *   useSetPageContext({
 *     title: "Warehouse Setup",
 *     entityType: "warehouse-setup",
 *     entityId: params.id,
 *   });
 *
 *   return <WarehouseSetupForm />;
 * }
 * ```
 */
export function useSetPageContext(config: PageConfig) {
  const context = useContext(PageContextContext);
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
export function usePageContext(): PageConfig | undefined {
  const context = useContext(PageContextContext);
  return context?.pageConfig;
}
