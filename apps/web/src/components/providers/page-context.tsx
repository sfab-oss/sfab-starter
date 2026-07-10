import type { ChatContext } from "@workspace/contract/ai";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
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

export function useSetPageContext(config: PageConfig) {
  const context = useContext(PageContextContext);

  useLayoutEffect(() => {
    // Always set on mount / config change. The previous content-equality
    // guard skipped the first paint because configRef was initialized to
    // `config`, leaving pageConfig undefined and the chip unmounted.
    context?.setPageConfig(config);
    return () => {
      context?.setPageConfig(undefined);
    };
  }, [context, config]);
}

export function usePageContext(): PageConfig | undefined {
  const context = useContext(PageContextContext);
  return context?.pageConfig;
}
