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

export function useSetPageContext(config: PageConfig) {
  const context = useContext(PageContextContext);
  const configRef = useRef(config);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    if (JSON.stringify(configRef.current) !== JSON.stringify(config)) {
      context?.setPageConfig(config);
      configRef.current = config;
    }

    return () => {
      if (!isFirstRender.current) {
        context?.setPageConfig(undefined);
      }
      isFirstRender.current = false;
    };
  }, [context, config]);
}

export function usePageContext(): PageConfig | undefined {
  const context = useContext(PageContextContext);
  return context?.pageConfig;
}
