"use client";

import type {
  ChatSummary,
  OrgMemorySnapshot,
  WorkspaceFileInfo,
} from "@workspace/agent/types";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { useAgent } from "agents/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useChatTabsStore } from "@/components/chat/dock/chat-tabs-store";

export type ChatHistoryLoadState = "loading" | "ready" | "error";

interface ChatOrgConnectionValue {
  createChat: (opts?: { title?: string }) => Promise<ChatSummary | null>;
  deleteChat: (chatId: string) => Promise<void>;
  getOrgMemory: () => Promise<OrgMemorySnapshot>;
  historyLoadState: ChatHistoryLoadState;
  /** Read-only workspace listing for the file viewer (defaults to root). */
  listWorkspace: (path?: string) => Promise<WorkspaceFileInfo[]>;
  organizationId: string;
  /** Read a workspace file's text contents (null when absent/binary). */
  readWorkspaceFile: (path: string) => Promise<string | null>;
  /** Bumps whenever the org workspace changes, so viewers can refetch live. */
  workspaceVersion: number;
}

const ChatOrgConnectionContext = createContext<ChatOrgConnectionValue | null>(
  null
);

export function useChatOrgConnection() {
  const ctx = useContext(ChatOrgConnectionContext);
  if (!ctx) {
    throw new Error(
      "useChatOrgConnection must be used within <ChatOrgConnection />"
    );
  }
  return ctx;
}

export interface ChatOrgConnectionProps {
  children: ReactNode;
  organizationId: string;
}

export function ChatOrgConnection({
  organizationId,
  children,
}: ChatOrgConnectionProps) {
  const [workspaceVersion, setWorkspaceVersion] = useState(0);

  const orgAgent = useAgent({
    agent: "OrgAgent",
    name: organizationId,
    onMessage: (event) => {
      // The OrgAgent broadcasts `{ type: "workspace-change", event }` whenever a
      // file is created/updated/deleted (see OrgAgent.broadcastWorkspaceChange).
      // Bump a version counter so open file viewers refetch. Ignore anything
      // that isn't our JSON signal (the agent framework sends other frames too).
      if (typeof event.data !== "string") {
        return;
      }
      try {
        const parsed = JSON.parse(event.data) as { type?: string };
        if (parsed.type === "workspace-change") {
          setWorkspaceVersion((v) => v + 1);
        }
      } catch {
        // Non-JSON frame — not a workspace-change signal.
      }
    },
  });

  const reconcileChats = useChatTabsStore((s) => s.reconcileChats);
  const closeTab = useChatTabsStore((s) => s.closeTab);
  const [historyLoadState, setHistoryLoadState] =
    useState<ChatHistoryLoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    setHistoryLoadState("loading");
    orgAgent.ready
      .then(() => orgAgent.call("listChats", []))
      .then((chatList) => {
        if (cancelled) {
          return;
        }
        const list = Array.isArray(chatList) ? (chatList as ChatSummary[]) : [];
        reconcileChats(organizationId, list);
        setHistoryLoadState("ready");
      })
      .catch((error) => {
        console.error("[ChatOrgConnection] failed to load chats", error);
        if (!cancelled) {
          setHistoryLoadState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [orgAgent, organizationId, reconcileChats]);

  const refreshChats = useCallback(async () => {
    const list = (await orgAgent.call("listChats", [])) as ChatSummary[];
    const safeList = Array.isArray(list) ? list : [];
    reconcileChats(organizationId, safeList);
    return safeList;
  }, [orgAgent, organizationId, reconcileChats]);

  const createChat = useCallback(
    async (opts?: { title?: string }) => {
      const chat = (await orgAgent.call(
        "createChat",
        opts ? [opts] : []
      )) as ChatSummary | null;
      await refreshChats();
      return chat;
    },
    [orgAgent, refreshChats]
  );

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        await orgAgent.call("deleteChat", [chatId]);
        await refreshChats();
        const org = useChatTabsStore.getState().byOrganization[organizationId];
        const tabKey = org?.tabs.find((t) => t.chatId === chatId)?.tabKey;
        if (tabKey) {
          closeTab(organizationId, tabKey);
        }
      } catch (error) {
        console.error("[ChatOrgConnection] failed to delete chat", error);
        toast.error("Couldn't delete chat. Please try again.");
      }
    },
    [orgAgent, refreshChats, closeTab, organizationId]
  );

  const getOrgMemory = useCallback(async (): Promise<OrgMemorySnapshot> => {
    const snapshot = (await orgAgent.call(
      "getOrgMemory",
      []
    )) as OrgMemorySnapshot | null;
    return snapshot ?? { content: null, updatedAt: null };
  }, [orgAgent]);

  const listWorkspace = useCallback(
    async (path = "/"): Promise<WorkspaceFileInfo[]> => {
      await orgAgent.ready;
      const entries = (await orgAgent.call("listWorkspace", [path])) as
        | WorkspaceFileInfo[]
        | null;
      return Array.isArray(entries) ? entries : [];
    },
    [orgAgent]
  );

  const readWorkspaceFile = useCallback(
    async (path: string): Promise<string | null> => {
      await orgAgent.ready;
      return (await orgAgent.call("readWorkspaceFile", [path])) as
        | string
        | null;
    },
    [orgAgent]
  );

  const value = useMemo<ChatOrgConnectionValue>(
    () => ({
      createChat,
      deleteChat,
      getOrgMemory,
      historyLoadState,
      listWorkspace,
      organizationId,
      readWorkspaceFile,
      workspaceVersion,
    }),
    [
      createChat,
      deleteChat,
      getOrgMemory,
      historyLoadState,
      listWorkspace,
      organizationId,
      readWorkspaceFile,
      workspaceVersion,
    ]
  );

  return (
    <ChatOrgConnectionContext.Provider value={value}>
      {children}
    </ChatOrgConnectionContext.Provider>
  );
}
