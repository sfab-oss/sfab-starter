"use client";

import type { WorkspaceFileInfo } from "@workspace/agent/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { useChatOrgConnection } from "@/components/chat/connection/chat-org-connection";

const ROOT = "/";

type FileState = "idle" | "loading" | "loaded" | "error";

export interface WorkspaceTree {
  /** Directory entries once loaded; `undefined` while unloaded. */
  getEntries: (dir: string) => WorkspaceFileInfo[] | undefined;
  isDirLoading: (dir: string) => boolean;
  isExpanded: (dir: string) => boolean;
  toggleDir: (dir: string) => void;
  /** Top-level (root) load error, if any. */
  rootError: string | null;
  selectedPath: string | null;
  selectedName: string | null;
  fileContent: string | null;
  fileState: FileState;
  openFile: (path: string, name: string) => void;
  closeFile: () => void;
}

/**
 * Per-panel state for the read-only workspace file viewer. Directories are
 * fetched lazily via `listWorkspace(dir)` as they are expanded (cheaper than a
 * recursive glob on large trees). The open file's text is loaded via
 * `readWorkspaceFile`. Everything refetches when the org connection reports a
 * `workspace-change` (via `workspaceVersion`), so the viewer stays live as the
 * agent writes files.
 */
export function useWorkspaceTree(): WorkspaceTree {
  const { listWorkspace, readWorkspaceFile, workspaceVersion } =
    useChatOrgConnection();

  const [entriesByDir, setEntriesByDir] = useState<
    Record<string, WorkspaceFileInfo[]>
  >({});
  const [loadingDirs, setLoadingDirs] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    [ROOT]: true,
  });
  const [rootError, setRootError] = useState<string | null>(null);

  const [selected, setSelected] = useState<{
    path: string;
    name: string;
  } | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileState, setFileState] = useState<FileState>("idle");

  // Keep the set of loaded dirs in a ref so the workspace-change effect can
  // refetch exactly what's on screen without depending on it (which would
  // re-run the effect on every load).
  const loadedDirsRef = useRef<Set<string>>(new Set());

  const loadDir = useCallback(
    async (dir: string) => {
      setLoadingDirs((prev) => ({ ...prev, [dir]: true }));
      try {
        const entries = await listWorkspace(dir);
        setEntriesByDir((prev) => ({ ...prev, [dir]: entries }));
        loadedDirsRef.current.add(dir);
        if (dir === ROOT) {
          setRootError(null);
        }
      } catch (error) {
        console.error("[workspace] failed to list", dir, error);
        if (dir === ROOT) {
          setRootError("Couldn't load the workspace.");
        }
      } finally {
        setLoadingDirs((prev) => ({ ...prev, [dir]: false }));
      }
    },
    [listWorkspace]
  );

  const loadFile = useCallback(
    async (path: string) => {
      setFileState("loading");
      setFileContent(null);
      try {
        const content = await readWorkspaceFile(path);
        setFileContent(content);
        setFileState("loaded");
      } catch (error) {
        console.error("[workspace] failed to read", path, error);
        setFileState("error");
      }
    },
    [readWorkspaceFile]
  );

  useEffect(() => {
    loadDir(ROOT);
  }, [loadDir]);

  // On a workspace change, refetch every already-loaded directory plus the open
  // file so the tree and preview reflect the latest state.
  useEffect(() => {
    if (workspaceVersion === 0) {
      return;
    }
    for (const dir of loadedDirsRef.current) {
      loadDir(dir);
    }
    if (selected) {
      loadFile(selected.path);
    }
  }, [workspaceVersion, loadDir, loadFile, selected]);

  const toggleDir = useCallback(
    (dir: string) => {
      setExpanded((prev) => {
        const next = { ...prev, [dir]: !prev[dir] };
        return next;
      });
      if (!(expanded[dir] || loadedDirsRef.current.has(dir))) {
        loadDir(dir);
      }
    },
    [expanded, loadDir]
  );

  const openFile = useCallback(
    (path: string, name: string) => {
      setSelected({ path, name });
      loadFile(path);
    },
    [loadFile]
  );

  const closeFile = useCallback(() => {
    setSelected(null);
    setFileContent(null);
    setFileState("idle");
  }, []);

  const getEntries = useCallback(
    (dir: string) => entriesByDir[dir],
    [entriesByDir]
  );
  const isDirLoading = useCallback(
    (dir: string) => Boolean(loadingDirs[dir]),
    [loadingDirs]
  );
  const isExpanded = useCallback(
    (dir: string) => Boolean(expanded[dir]),
    [expanded]
  );

  return {
    getEntries,
    isDirLoading,
    isExpanded,
    toggleDir,
    rootError,
    selectedPath: selected?.path ?? null,
    selectedName: selected?.name ?? null,
    fileContent,
    fileState,
    openFile,
    closeFile,
  };
}

/** Text vs binary decision from mime type (with an extension fallback). */
export function isTextFile(
  info: Pick<WorkspaceFileInfo, "mimeType" | "name">
): boolean {
  const mime = info.mimeType ?? "";
  if (mime.startsWith("text/")) {
    return true;
  }
  if (
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("csv") ||
    mime.includes("yaml") ||
    mime.includes("markdown")
  ) {
    return true;
  }
  if (mime && !mime.startsWith("application/octet-stream")) {
    // Known non-text mime (image/pdf/etc.) → treat as binary.
    return false;
  }
  const ext = info.name.split(".").pop()?.toLowerCase();
  const textExts = new Set([
    "txt",
    "md",
    "mdx",
    "json",
    "jsonl",
    "csv",
    "tsv",
    "yaml",
    "yml",
    "js",
    "jsx",
    "ts",
    "tsx",
    "html",
    "css",
    "sql",
    "sh",
    "toml",
    "env",
    "log",
    "xml",
  ]);
  return ext ? textExts.has(ext) : false;
}
