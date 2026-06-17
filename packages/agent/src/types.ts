export interface ChatSummary {
  createdAt: number;
  id: string;
  title: string;
  updatedAt: number;
}

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
  };
}
