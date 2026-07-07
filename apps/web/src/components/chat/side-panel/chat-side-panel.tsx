"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/shadcn/resizable";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  ChevronLeftIcon,
  FileIcon,
  Loader2Icon,
  PanelRightCloseIcon,
} from "lucide-react";
import { FileExplorerTree } from "./file-explorer-tree";
import { isTextFile, useWorkspaceTree } from "./use-workspace-tree";

/**
 * Read-only workspace file viewer for the expanded chat window. Files-only (no
 * browser/terminal tabs — those have no backend yet). On desktop it's a
 * resizable content/tree split; on mobile the tree fills and tapping a file
 * pushes its content with a back affordance.
 */
export function ChatSidePanel({ onClosePanel }: { onClosePanel: () => void }) {
  const tree = useWorkspaceTree();
  const isMobile = useIsMobile();

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-muted/15"
      data-slot="chat-side-panel"
    >
      <div className="flex h-10 shrink-0 items-center gap-1 border-b bg-background px-2">
        <span className="px-1 font-medium text-sm">Files</span>
        <Button
          className="ml-auto size-7"
          onClick={onClosePanel}
          size="icon"
          type="button"
          variant="ghost"
        >
          <PanelRightCloseIcon className="size-3.5" />
          <span className="sr-only">Close files panel</span>
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {isMobile ? <MobileFiles tree={tree} /> : <DesktopFiles tree={tree} />}
      </div>
    </div>
  );
}

function DesktopFiles({ tree }: { tree: ReturnType<typeof useWorkspaceTree> }) {
  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel className="min-h-0" defaultSize={65} minSize={40}>
        <FilePreview tree={tree} />
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel
        className="min-h-0 overflow-auto bg-background"
        defaultSize={35}
        maxSize={55}
        minSize={20}
      >
        <FileExplorerTree tree={tree} />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

function MobileFiles({ tree }: { tree: ReturnType<typeof useWorkspaceTree> }) {
  if (tree.selectedPath && tree.selectedName) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <button
          className="flex h-11 shrink-0 items-center gap-1 border-b px-3 text-muted-foreground text-sm"
          onClick={() => tree.closeFile()}
          type="button"
        >
          <ChevronLeftIcon className="size-4" />
          Files
        </button>
        <div className="min-h-0 flex-1 overflow-hidden">
          <FilePreview tree={tree} />
        </div>
      </div>
    );
  }
  return (
    <div className="h-full min-h-0 overflow-auto bg-background">
      <FileExplorerTree tree={tree} />
    </div>
  );
}

function FilePreview({ tree }: { tree: ReturnType<typeof useWorkspaceTree> }) {
  if (!(tree.selectedPath && tree.selectedName)) {
    return <NoFileSelected />;
  }

  const path = tree.selectedPath;
  const name = tree.selectedName;

  if (tree.fileState === "loading") {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground text-sm">
        <Loader2Icon className="size-4 animate-spin" />
        Loading {name}…
      </div>
    );
  }

  if (tree.fileState === "error") {
    return (
      <Placeholder
        description={`Couldn't read ${name}. It may have been moved or deleted.`}
        title={name}
      />
    );
  }

  // Binary/unsupported files can't render as text (mime is unknown here, so
  // fall back to the extension heuristic).
  if (!isTextFile({ mimeType: "", name })) {
    return (
      <Placeholder
        description={`Preview for ${name} isn't supported yet — only text files render here.`}
        title={name}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b px-3 py-2 text-muted-foreground text-xs">
        {path}
      </div>
      <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed">
        {tree.fileContent ?? `// ${name} is empty`}
      </pre>
    </div>
  );
}

function NoFileSelected() {
  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center"
      data-slot="no-file-selected"
    >
      <FileIcon className="size-6 text-muted-foreground" />
      <p className="font-medium text-sm">No file selected</p>
      <p className="max-w-xs text-muted-foreground text-xs">
        Select a file from the tree to preview its contents.
      </p>
    </div>
  );
}

function Placeholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <p className="font-medium text-sm">{title}</p>
      <p className="max-w-xs text-muted-foreground text-xs">{description}</p>
    </div>
  );
}
