"use client";

import type { WorkspaceFileInfo } from "@workspace/agent/types";
import { cn } from "@workspace/ui/lib/utils";
import {
  ChevronRightIcon,
  FileIcon,
  FolderIcon,
  Loader2Icon,
} from "lucide-react";
import type { WorkspaceTree } from "./use-workspace-tree";

/**
 * Read-only workspace file tree. Directories load their children lazily on
 * first expand via the `tree` controller (which talks to the OrgAgent
 * `listWorkspace` RPC), so nothing is fetched until the user drills in.
 */
export function FileExplorerTree({
  tree,
  className,
}: {
  tree: WorkspaceTree;
  className?: string;
}) {
  const rootEntries = tree.getEntries("/");

  if (rootEntries === undefined) {
    return <TreeLoading className={className} />;
  }

  if (tree.rootError) {
    return (
      <p className={cn("px-3 py-6 text-destructive text-sm", className)}>
        {tree.rootError}
      </p>
    );
  }

  if (rootEntries.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-4 py-10 text-center",
          className
        )}
      >
        <FolderIcon className="size-6 text-muted-foreground" />
        <p className="font-medium text-sm">No files yet</p>
        <p className="max-w-xs text-muted-foreground text-xs">
          Files the assistant creates in this workspace will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-col gap-0.5 p-2 text-sm", className)}
      data-slot="file-explorer-tree"
    >
      {sortEntries(rootEntries).map((entry) => (
        <FileExplorerTreeNode entry={entry} key={entry.path} tree={tree} />
      ))}
    </div>
  );
}

function FileExplorerTreeNode({
  entry,
  depth = 0,
  tree,
}: {
  entry: WorkspaceFileInfo;
  depth?: number;
  tree: WorkspaceTree;
}) {
  if (entry.type !== "directory") {
    const isSelected = tree.selectedPath === entry.path;
    return (
      <button
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted hover:text-foreground",
          isSelected ? "bg-muted text-foreground" : "text-muted-foreground"
        )}
        data-slot="file-explorer-tree-file"
        onClick={() => tree.openFile(entry.path, entry.name)}
        type="button"
      >
        <FileIcon className="size-3.5 shrink-0" />
        <span className="truncate">{entry.name}</span>
      </button>
    );
  }

  const isOpen = tree.isExpanded(entry.path);
  const children = tree.getEntries(entry.path);
  const isLoading = tree.isDirLoading(entry.path);

  return (
    <div data-slot="file-explorer-tree-folder">
      <button
        className="group flex w-full items-center gap-1 rounded-md px-2 py-1.5 text-left hover:bg-muted"
        onClick={() => tree.toggleDir(entry.path)}
        type="button"
      >
        <ChevronRightIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-90"
          )}
        />
        <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate font-medium">{entry.name}</span>
      </button>
      {isOpen ? (
        <div className="ml-3.5 flex flex-col gap-0.5 border-border/60 border-l pl-1.5">
          <DirectoryChildren
            depth={depth}
            entries={children}
            isLoading={isLoading}
            tree={tree}
          />
        </div>
      ) : null}
    </div>
  );
}

function DirectoryChildren({
  depth,
  entries,
  isLoading,
  tree,
}: {
  depth: number;
  entries: WorkspaceFileInfo[] | undefined;
  isLoading: boolean;
  tree: WorkspaceTree;
}) {
  if (entries === undefined || isLoading) {
    return (
      <span className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground text-xs">
        <Loader2Icon className="size-3 animate-spin" />
        Loading…
      </span>
    );
  }
  if (entries.length === 0) {
    return (
      <span className="px-2 py-1.5 text-muted-foreground text-xs">Empty</span>
    );
  }
  return (
    <>
      {sortEntries(entries).map((child) => (
        <FileExplorerTreeNode
          depth={depth + 1}
          entry={child}
          key={child.path}
          tree={tree}
        />
      ))}
    </>
  );
}

function TreeLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-4 text-muted-foreground text-sm",
        className
      )}
    >
      <Loader2Icon className="size-3.5 animate-spin" />
      Loading workspace…
    </div>
  );
}

/** Directories first, then files, each alphabetically. */
function sortEntries(entries: WorkspaceFileInfo[]): WorkspaceFileInfo[] {
  return [...entries].sort((a, b) => {
    const aDir = a.type === "directory";
    const bDir = b.type === "directory";
    if (aDir !== bDir) {
      return aDir ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}
