import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

type ToolHandler = (input: unknown) => Promise<unknown>;
type ToolHandlerMap = Record<string, ToolHandler>;

interface ToolHandlerContextValue {
  handlers: RefObject<ToolHandlerMap>;
  register: (name: string, handler: ToolHandler) => void;
  unregister: (name: string) => void;
}

const ToolHandlerContext = createContext<ToolHandlerContextValue | null>(null);

export function useToolHandlers() {
  const context = useContext(ToolHandlerContext);
  if (!context) {
    throw new Error("useToolHandlers must be used within ToolHandlerRegistry");
  }
  return context.handlers;
}

export function ToolHandlerRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  const handlersRef = useRef<ToolHandlerMap>({});

  const register = useCallback((name: string, handler: ToolHandler) => {
    handlersRef.current[name] = handler;
  }, []);

  const unregister = useCallback((name: string) => {
    delete handlersRef.current[name];
  }, []);

  return (
    <ToolHandlerContext.Provider
      value={{ handlers: handlersRef, register, unregister }}
    >
      {children}
    </ToolHandlerContext.Provider>
  );
}

export function useRegisterToolHandler(name: string, handler: ToolHandler) {
  const context = useContext(ToolHandlerContext);
  if (!context) {
    throw new Error(
      "useRegisterToolHandler must be used within ToolHandlerRegistry"
    );
  }

  const { register, unregister } = context;
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const stableHandler: ToolHandler = (input) => handlerRef.current(input);
    register(name, stableHandler);
    return () => unregister(name);
  }, [name, register, unregister]);
}
