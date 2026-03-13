"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/shadcn/resizable";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/shadcn/sidebar";
import { cn } from "@workspace/ui/lib/utils";
import { PanelRight, PanelRightClose } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// --- 1. Global Shell (Layout Wrapper) ---

export function AppLayout({
  children,
  sidebar,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {sidebar}
      <div className="relative flex h-svh w-full flex-1 flex-col md:peer-data-[state=collapsed]:peer-data-[variant=inset]:pl-0 md:peer-data-[variant=inset]:p-2 md:peer-data-[variant=inset]:pl-0">
        <SidebarInset className="overflow-hidden rounded-xl bg-background shadow">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

// --- 2. Page Container ---

export function AppLayoutPage({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex h-full w-full flex-col overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// --- 3. Header System ---

export function AppLayoutHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
        className
      )}
      {...props}
    >
      <SidebarTrigger className="-ml-1 md:hidden" />
      <Separator className="mr-2 h-4 md:hidden" orientation="vertical" />
      {children}
    </header>
  );
}

export function AppLayoutHeaderIcon({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center justify-center text-muted-foreground [&>svg]:size-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AppLayoutHeaderTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn("truncate font-medium text-foreground text-sm", className)}
      {...props}
    >
      {children}
    </h1>
  );
}

export function AppLayoutHeaderActions({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("ml-auto flex items-center gap-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

// --- 4. Content Area ---

/**
 *
 * @param className - The class name to apply to the content area.
 * @param children - The children to render inside the content area.
 * @param variant - The variant of the content area, Use "fixed" so child components (Table/Doc) control their own scroll.
 * @param props - The props to apply to the content area.
 * @returns
 */
export function AppLayoutContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// --- 5. Resizable Layout System ---

// --- Resizable Context ---

interface ResizableContextValue {
  panels: Record<string, boolean>;
  togglePanel: (panelId: string) => void;
  setPanelOpen: (panelId: string, open: boolean) => void;
}

const ResizableContext = createContext<ResizableContextValue | null>(null);

export function useResizablePanels() {
  const context = useContext(ResizableContext);
  if (!context) {
    throw new Error(
      "useResizablePanels must be used within AppLayoutResizableProvider"
    );
  }
  return context;
}

// --- Cookie Storage Utility ---

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setCookie(name: string, value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API not widely supported
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  if (!match?.[2]) {
    return null;
  }
  return decodeURIComponent(match[2]);
}

// Cookie-based storage adapter for react-resizable-panels
function createCookieStorage(cookieName: string) {
  return {
    getItem(name: string): string | null {
      const cookie = getCookie(cookieName);
      if (!cookie) {
        return null;
      }
      try {
        const data = JSON.parse(cookie);
        return data[name] ?? null;
      } catch {
        return null;
      }
    },
    setItem(name: string, value: string): void {
      const cookie = getCookie(cookieName);
      let data: Record<string, string> = {};
      if (cookie) {
        try {
          data = JSON.parse(cookie);
        } catch {
          data = {};
        }
      }
      data[name] = value;
      setCookie(cookieName, JSON.stringify(data));
    },
  };
}

const PANELS_VISIBILITY_COOKIE = "app_panels_visibility";

export function AppLayoutResizable({
  className,
  direction = "horizontal",
  children,
  autoSaveId,
  defaultPanels = {},
  ...props
}: Omit<React.ComponentProps<typeof ResizablePanelGroup>, "direction"> & {
  direction?: "horizontal" | "vertical";
  children: React.ReactNode;
  autoSaveId?: string;
  defaultPanels?: Record<string, boolean>;
}) {
  const [panels, setPanels] = useState<Record<string, boolean>>(defaultPanels);

  // Persist panels visibility to cookie when it changes
  useEffect(() => {
    if (Object.keys(panels).length > 0) {
      setCookie(PANELS_VISIBILITY_COOKIE, JSON.stringify(panels));
    }
  }, [panels]);

  const togglePanel = useCallback((panelId: string) => {
    setPanels((prev) => ({ ...prev, [panelId]: !prev[panelId] }));
  }, []);

  const setPanelOpen = useCallback((panelId: string, open: boolean) => {
    setPanels((prev) => ({ ...prev, [panelId]: open }));
  }, []);

  const contextValue = useMemo(
    () => ({
      panels,
      togglePanel,
      setPanelOpen,
    }),
    [panels, togglePanel, setPanelOpen]
  );

  // Create cookie storage if autoSaveId is provided
  const storage = useMemo(() => {
    if (!autoSaveId) {
      return undefined;
    }
    return createCookieStorage(`app_panel_sizes_${autoSaveId}`);
  }, [autoSaveId]);

  return (
    <ResizableContext.Provider value={contextValue}>
      <ResizablePanelGroup
        autoSaveId={autoSaveId}
        className={cn("min-h-0 flex-1", className)}
        direction={direction}
        storage={storage}
        {...props}
      >
        {children}
      </ResizablePanelGroup>
    </ResizableContext.Provider>
  );
}

export function AppLayoutResizablePanelPrimary({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ResizablePanel>) {
  return (
    <ResizablePanel
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </ResizablePanel>
  );
}

export function AppLayoutResizablePanelSecondary({
  className,
  children,
  id,
  defaultOpen = true,
  ...props
}: React.ComponentProps<typeof ResizablePanel> & {
  defaultOpen?: boolean;
}) {
  const { panels, setPanelOpen } = useResizablePanels();

  // Initialize panel state if not set
  useEffect(() => {
    if (id && panels[id] === undefined) {
      setPanelOpen(id, defaultOpen);
    }
  }, [id, defaultOpen, panels, setPanelOpen]);

  // Don't render if panel is closed
  if (id && panels[id] === false) {
    return null;
  }

  return (
    <>
      <ResizableHandle className="bg-transparent" />
      <ResizablePanel
        className={cn(
          "ml-px flex min-h-0 flex-col overflow-hidden rounded-l-xl border-border border-l bg-accent/5 shadow",
          className
        )}
        id={id}
        {...props}
      >
        {children}
      </ResizablePanel>
    </>
  );
}

export function AppLayoutResizablePanelTrigger({
  className,
  children,
  panelId,
  ...props
}: React.ComponentProps<typeof Button> & {
  panelId: string;
}) {
  const { panels, togglePanel } = useResizablePanels();

  return (
    <Button
      aria-label={panels[panelId] === false ? "Open panel" : "Close panel"}
      className={className}
      onClick={() => togglePanel(panelId)}
      size="icon"
      variant="ghost"
      {...props}
    >
      {panels[panelId] === false ? <PanelRight /> : <PanelRightClose />}
      {children}
    </Button>
  );
}
