"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/shadcn/collapsible";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/shadcn/resizable";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import {
  Sidebar,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarProvider,
} from "@workspace/ui/components/shadcn/sidebar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/shadcn/tabs";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/shadcn/toggle-group";
import { cn } from "@workspace/ui/lib/utils";
import type {
  registryItemFileSchema,
  registryItemSchema,
} from "@workspace/ui-ds/config/schema";
import { useCopyToClipboard } from "@workspace/ui-ds/hooks/use-copy-to-clipboard";
import type {
  createFileTreeForRegistryItemFiles,
  FileTree,
} from "@workspace/ui-ds/lib/registry";
import {
  Check,
  ChevronRight,
  Clipboard,
  File,
  FileCode,
  Folder,
  Fullscreen,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import Link from "next/link";
// biome-ignore lint/performance/noNamespaceImport: It ok for React
import * as React from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import type { z } from "zod";

interface BlockViewerContext {
  item: z.infer<typeof registryItemSchema>;
  view: "code" | "preview";
  setView: (view: "code" | "preview") => void;
  activeFile: string | null;
  setActiveFile: (file: string) => void;
  resizablePanelRef: React.RefObject<ImperativePanelHandle | null> | null;
  tree: ReturnType<typeof createFileTreeForRegistryItemFiles> | null;
  highlightedFiles:
    | (z.infer<typeof registryItemFileSchema> & {
        highlightedContent: string;
      })[]
    | null;
  iframeKey?: number;
  setIframeKey?: React.Dispatch<React.SetStateAction<number>>;
}

const BlockViewerContext = React.createContext<BlockViewerContext | null>(null);

function useBlockViewer() {
  const context = React.useContext(BlockViewerContext);
  if (!context) {
    throw new Error(
      "useBlockViewer must be used within a BlockViewerProvider."
    );
  }
  return context;
}

function BlockViewerProvider({
  item,
  tree,
  highlightedFiles,
  children,
}: Pick<BlockViewerContext, "item" | "tree" | "highlightedFiles"> & {
  children: React.ReactNode;
}) {
  const [view, setView] = React.useState<BlockViewerContext["view"]>("preview");
  const [activeFile, setActiveFile] = React.useState<
    BlockViewerContext["activeFile"]
  >(highlightedFiles?.[0]?.target ?? null);
  const resizablePanelRef = React.useRef<ImperativePanelHandle>(null);
  const [iframeKey, setIframeKey] = React.useState(0);

  return (
    <BlockViewerContext.Provider
      value={{
        item,
        view,
        setView,
        resizablePanelRef,
        activeFile,
        setActiveFile,
        tree,
        highlightedFiles,
        iframeKey,
        setIframeKey,
      }}
    >
      <div
        className="group/block-view-wrapper flex min-w-0 scroll-mt-24 flex-col items-stretch gap-4 overflow-hidden"
        data-view={view}
        id={item.name}
        style={
          {
            "--height": item.meta?.iframeHeight ?? "930px",
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </BlockViewerContext.Provider>
  );
}

function BlockViewerToolbar() {
  const { setView, view, item, resizablePanelRef, setIframeKey } =
    useBlockViewer();

  return (
    <div className="hidden w-full items-center gap-2 pl-2 md:pr-6 lg:flex">
      <Tabs
        onValueChange={(value) => setView(value as "preview" | "code")}
        value={view}
      >
        <TabsList className="grid h-8 grid-cols-2 items-center rounded-md p-1 *:data-[slot=tabs-trigger]:h-6 *:data-[slot=tabs-trigger]:rounded-sm *:data-[slot=tabs-trigger]:px-2 *:data-[slot=tabs-trigger]:text-xs">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
      </Tabs>
      <Separator className="mx-2 h-4" orientation="vertical" />
      <a
        className="flex-1 text-center font-medium text-sm underline-offset-2 hover:underline md:flex-auto md:text-left"
        href={`#${item.name}`}
      >
        {/** biome-ignore lint/performance/useTopLevelRegex: Ok */}
        {item.description?.replace(/\.$/, "")}
      </a>
      <div className="ml-auto flex items-center gap-2">
        <div className="h-8 items-center gap-1.5 rounded-md border p-1 shadow-none">
          <ToggleGroup
            className="gap-1 *:data-[slot=toggle-group-item]:size-6! *:data-[slot=toggle-group-item]:rounded-sm!"
            defaultValue="100"
            onValueChange={(value) => {
              setView("preview");
              if (resizablePanelRef?.current) {
                resizablePanelRef.current.resize(Number.parseInt(value, 10));
              }
            }}
            type="single"
          >
            <ToggleGroupItem title="Desktop" value="100">
              <Monitor />
            </ToggleGroupItem>
            <ToggleGroupItem title="Tablet" value="60">
              <Tablet />
            </ToggleGroupItem>
            <ToggleGroupItem title="Mobile" value="30">
              <Smartphone />
            </ToggleGroupItem>
            <Separator className="h-4" orientation="vertical" />
            <Button
              asChild
              className="size-6 rounded-sm p-0"
              size="icon"
              title="Open in New Tab"
              variant="ghost"
            >
              <Link href={`/view/${item.name}`} target="_blank">
                <span className="sr-only">Open in New Tab</span>
                <Fullscreen />
              </Link>
            </Button>
            <Separator className="h-4" orientation="vertical" />
            <Button
              className="size-6 rounded-sm p-0"
              onClick={() => {
                if (setIframeKey) {
                  setIframeKey((k) => k + 1);
                }
              }}
              size="icon"
              title="Refresh Preview"
              variant="ghost"
            >
              <RotateCw />
              <span className="sr-only">Refresh Preview</span>
            </Button>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}

function BlockViewerIframe({ className }: { className?: string }) {
  const { item, iframeKey } = useBlockViewer();

  return (
    <iframe
      className={cn(
        "no-scrollbar relative z-20 w-full bg-background",
        className
      )}
      height={item.meta?.iframeHeight ?? 930}
      key={iframeKey}
      loading="lazy"
      src={`/design-system/view/${item.name}`}
      title="Block Preview"
    />
  );
}

function BlockViewerView() {
  const { resizablePanelRef, item } = useBlockViewer();

  return (
    <div className="hidden group-data-[view=code]/block-view-wrapper:hidden md:h-[--height] lg:flex">
      <div className="relative grid w-full gap-4">
        <div className="absolute inset-0 right-4 rounded-xl bg-muted" />
        <ResizablePanelGroup
          className="relative z-10 after:absolute after:inset-0 after:right-3 after:z-0 after:rounded-xl after:bg-surface/50"
          direction="horizontal"
          id={`block-viewer-${item.name}`}
        >
          <ResizablePanel
            className="relative aspect-[4/2.5] overflow-hidden rounded-lg border bg-background md:aspect-auto md:rounded-xl"
            defaultSize={100}
            minSize={30}
            ref={resizablePanelRef}
          >
            <BlockViewerIframe />
          </ResizablePanel>
          <ResizableHandle className="pointer-events-none relative w-3 bg-transparent p-0 opacity-0 after:absolute after:top-1/2 after:right-0 after:h-8 after:w-[6px] after:-translate-x-px after:-translate-y-1/2 after:rounded-full after:bg-border after:transition-all after:hover:h-10 md:pointer-events-auto md:opacity-100" />
          <ResizablePanel defaultSize={0} minSize={0} />
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

function BlockViewerCode() {
  const { activeFile, highlightedFiles } = useBlockViewer();

  const file = React.useMemo(() => {
    return highlightedFiles?.find((file) => file.target === activeFile);
  }, [highlightedFiles, activeFile]);

  if (!file) {
    return null;
  }

  return (
    <div className="mr-[14px] flex overflow-hidden rounded-xl border bg-code text-code-foreground group-data-[view=preview]/block-view-wrapper:hidden md:h-[--height]">
      <div className="w-72">
        <BlockViewerFileTree />
      </div>
      <figure className="mx-0 mt-0 flex min-w-0 flex-1 flex-col rounded-xl border-none">
        <figcaption className="flex h-12 shrink-0 items-center gap-2 border-b px-4 py-2 text-code-foreground [&_svg]:size-4 [&_svg]:opacity-70">
          <FileCode className="size-4" />
          {file.target}
          <div className="ml-auto flex items-center gap-2">
            <BlockCopyCodeButton />
          </div>
        </figcaption>
        <div
          className="no-scrollbar overflow-y-auto"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Ok
          dangerouslySetInnerHTML={{
            __html: file?.highlightedContent ?? "",
          }}
          key={file?.path}
        />
      </figure>
    </div>
  );
}

export function BlockViewerFileTree() {
  const { tree } = useBlockViewer();

  if (!tree) {
    return null;
  }

  return (
    <SidebarProvider className="flex min-h-full flex-col border-r">
      <Sidebar className="w-full flex-1" collapsible="none">
        <SidebarGroupLabel className="h-12 rounded-none border-b px-4 text-sm">
          Files
        </SidebarGroupLabel>
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="translate-x-0 gap-1.5">
              {tree.map((file, index) => (
                <Tree index={1} item={file} key={`${file.name}-${index}`} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </Sidebar>
    </SidebarProvider>
  );
}

function Tree({ item, index }: { item: FileTree; index: number }) {
  const { activeFile, setActiveFile } = useBlockViewer();

  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          className="whitespace-nowrap rounded-none pl-[--index] hover:bg-muted-foreground/15 focus:bg-muted-foreground/15 focus-visible:bg-muted-foreground/15 active:bg-muted-foreground/15 data-[active=true]:bg-muted-foreground/15"
          isActive={item.path === activeFile}
          onClick={() => item.path && setActiveFile(item.path)}
          style={
            {
              "--index": `${index * (index === 2 ? 1.2 : 1.3)}rem`,
            } as React.CSSProperties
          }
        >
          <ChevronRight className="invisible" />
          <File className="h-4 w-4" />
          {item.name}
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="whitespace-nowrap rounded-none pl-[--index] hover:bg-muted-foreground/15 focus:bg-muted-foreground/15 focus-visible:bg-muted-foreground/15 active:bg-muted-foreground/15 data-[active=true]:bg-muted-foreground/15"
            style={
              {
                "--index": `${index * (index === 1 ? 1 : 1.2)}rem`,
              } as React.CSSProperties
            }
          >
            <ChevronRight className="transition-transform" />
            <Folder />
            {item.name}
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="m-0 w-full translate-x-0 border-none p-0">
            {item.children.map((subItem, key) => (
              <Tree
                index={index + 1}
                item={subItem}
                key={`${item.name}-${key}`}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

function BlockCopyCodeButton() {
  const { activeFile, item } = useBlockViewer();
  const { copyToClipboard, isCopied } = useCopyToClipboard();

  const file = React.useMemo(() => {
    return item.files?.find((file) => file.target === activeFile);
  }, [activeFile, item.files]);

  const content = file?.content;

  if (!content) {
    return null;
  }

  return (
    <Button
      className="size-7"
      onClick={() => {
        copyToClipboard(content);
      }}
      size="icon"
      variant="ghost"
    >
      {isCopied ? <Check /> : <Clipboard />}
    </Button>
  );
}

function BlockViewer({
  item,
  tree,
  highlightedFiles,
  children,
}: Pick<BlockViewerContext, "item" | "tree" | "highlightedFiles"> & {
  children?: React.ReactNode;
}) {
  return (
    <BlockViewerProvider
      highlightedFiles={highlightedFiles}
      item={item}
      tree={tree}
    >
      <BlockViewerToolbar />
      <BlockViewerView />
      <BlockViewerCode />
      {children && (
        <div className="flex flex-col gap-2 lg:hidden">
          <div className="flex items-center gap-2 px-2">
            <div className="line-clamp-1 font-medium text-sm">
              {item.description}
            </div>
            <div className="ml-auto shrink-0 font-mono text-muted-foreground text-xs">
              {item.name}
            </div>
          </div>
          {children}
        </div>
      )}
    </BlockViewerProvider>
  );
}

export { BlockViewer };
