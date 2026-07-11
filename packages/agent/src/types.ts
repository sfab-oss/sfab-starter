import type { FileInfo } from "@cloudflare/shell";

export interface ChatSummary {
  createdAt: number;
  id: string;
  title: string;
  updatedAt: number;
}

/**
 * A single workspace entry (file or directory) as returned by the read-only
 * workspace RPC. Re-exported from `@cloudflare/shell` so client code can type
 * the file viewer without depending on the shell package directly.
 */
export type WorkspaceFileInfo = FileInfo;

export interface OrgMemorySnapshot {
  content: string | null;
  updatedAt: number | null;
}

export interface AgentToolsContext {
  organizationId: string;
  userId: string;
  waitUntil: (promise: Promise<unknown>) => void;
}

export interface OrgPageContext {
  page: string;
  params: {
    entityType?: string;
    entityId?: string;
    title?: string;
    view?: Record<string, string | number | boolean>;
  };
}
