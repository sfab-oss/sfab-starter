import type { useAgentChat } from "@cloudflare/think/react";
import type { ChatSummary } from "@workspace/agent/types";
import type { AIDataPart, AIMetadata } from "@workspace/contract/ai";
import type { UIMessage } from "ai";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrgChatMessage = UIMessage<AIMetadata, AIDataPart>;

export type ChatHelpers = ReturnType<
  typeof useAgentChat<unknown, OrgChatMessage>
>;

export interface OutgoingMessage {
  metadata?: Pick<AIMetadata, "pageContext">;
  parts: OrgChatMessage["parts"];
  role: "user";
}

export type TabSize = "popup" | "fullscreen";

export interface TabEntry {
  chatId: string | null;
  pending: OutgoingMessage | null;
  sendError: string | null;
  size: TabSize;
  tabKey: string;
  title: string;
}

/** Which view the expanded-window side panel (the "Inspector") is showing. */
export type InspectorTab = "files" | "runs";

/**
 * A delegated sub-agent run opened for full-transcript inspection in the panel.
 * `chatId` + `runId` address the child facet
 * (`sub:[{OrgChat, chatId}, {OrgSubAgent, runId}]`); `title` labels the header.
 * (ALW-401 — sub-agent drill-in.)
 */
export interface ActiveSubAgentRun {
  chatId: string;
  runId: string;
  title: string;
  toolCallId: string;
}

interface OrganizationTabsState {
  focusedTabId: string | null;
  tabs: TabEntry[];
}

interface ChatTabsState {
  activeSubAgentRun: ActiveSubAgentRun | null;
  byOrganization: Record<string, OrganizationTabsState>;
  chatsByOrganization: Record<string, ChatSummary[]>;
  clearPending: (organizationId: string, tabKey: string) => void;
  clearSendError: (organizationId: string, tabKey: string) => void;
  closeBody: () => void;
  closeFilesPanel: () => void;
  closeTab: (organizationId: string, tabKey: string) => void;
  focusTab: (organizationId: string, tabKey: string) => void;
  /** Which view the expanded-window side panel is showing. */
  inspectorTab: InspectorTab;
  isBodyOpen: boolean;
  /** Whether the expanded-window side panel (files/runs inspector) is open. */
  isFilesPanelOpen: boolean;
  openBody: () => void;
  openFilesPanel: () => void;
  /**
   * Open a delegated sub-agent's full transcript in the panel: expands the
   * owning tab, opens the panel, switches it to the Runs tab, and selects `run`.
   */
  openSubAgentRun: (
    organizationId: string,
    tabKey: string,
    run: ActiveSubAgentRun
  ) => void;
  setInspectorTab: (tab: InspectorTab) => void;
  openDraftTab: (organizationId: string) => void;
  openTab: (organizationId: string, chatId: string, title: string) => void;
  reconcileChats: (organizationId: string, chats: ChatSummary[]) => void;
  setPending: (
    organizationId: string,
    tabKey: string,
    pending: OutgoingMessage
  ) => void;
  setSendError: (organizationId: string, tabKey: string, error: string) => void;
  setTabSize: (organizationId: string, tabKey: string, size: TabSize) => void;
  unfocusTab: (organizationId: string) => void;
  upgradeTab: (
    organizationId: string,
    tabKey: string,
    chatId: string,
    title: string
  ) => void;
}

const EMPTY_ORGANIZATION: OrganizationTabsState = {
  focusedTabId: null,
  tabs: [],
};

function getOrganization(
  state: ChatTabsState,
  organizationId: string
): OrganizationTabsState {
  return state.byOrganization[organizationId] ?? EMPTY_ORGANIZATION;
}

function setOrganization(
  state: ChatTabsState,
  organizationId: string,
  next: OrganizationTabsState
): Partial<ChatTabsState> {
  return {
    byOrganization: { ...state.byOrganization, [organizationId]: next },
  };
}

function makeTabKey(): string {
  return crypto.randomUUID();
}

/**
 * Remove every unsent draft tab (`chatId === null`), fixing focus if the
 * focused tab was one of them. Returns the same object when nothing changed so
 * callers can cheaply skip a no-op update.
 */
function dropDrafts(proj: OrganizationTabsState): OrganizationTabsState {
  const tabs = proj.tabs.filter((t) => t.chatId !== null);
  if (tabs.length === proj.tabs.length) {
    return proj;
  }
  const tabKeys = new Set(tabs.map((t) => t.tabKey));
  const focusedTabId =
    proj.focusedTabId && tabKeys.has(proj.focusedTabId)
      ? proj.focusedTabId
      : null;
  return { focusedTabId, tabs };
}

/** Drop every draft except the one identified by `keepTabKey`. */
function dropDraftsExcept(
  proj: OrganizationTabsState,
  keepTabKey: string
): TabEntry[] {
  return proj.tabs.filter((t) => t.chatId !== null || t.tabKey === keepTabKey);
}

export const useChatTabsStore = create<ChatTabsState>()(
  persist(
    (set) => ({
      activeSubAgentRun: null,
      byOrganization: {},
      chatsByOrganization: {},
      inspectorTab: "files",
      isBodyOpen: false,
      isFilesPanelOpen: false,

      openBody: () => set({ isBodyOpen: true }),
      // Minimizing discards any unsent drafts — a draft only earns a pill once
      // its first message promotes it into a real chat (see `upgradeTab`) — and
      // closes the file viewer so it starts closed on the next expand.
      closeBody: () =>
        set((state) => ({
          isBodyOpen: false,
          isFilesPanelOpen: false,
          inspectorTab: "files",
          activeSubAgentRun: null,
          byOrganization: Object.fromEntries(
            Object.entries(state.byOrganization).map(
              ([organizationId, proj]) =>
                dropDrafts(proj) === proj
                  ? [organizationId, proj]
                  : [organizationId, dropDrafts(proj)]
            )
          ),
        })),

      openFilesPanel: () => set({ isFilesPanelOpen: true }),
      closeFilesPanel: () => set({ isFilesPanelOpen: false }),

      setInspectorTab: (tab) => set({ inspectorTab: tab }),

      // Drill into a sub-agent: force the owning tab to fullscreen (the only
      // size with a side panel), open the panel, switch to Runs, and select the
      // run — all in one atomic update so `setTabSize`'s panel-reset can't race
      // it closed.
      openSubAgentRun: (organizationId, tabKey, run) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const tabs = proj.tabs.map((t) =>
            t.tabKey === tabKey ? { ...t, size: "fullscreen" as TabSize } : t
          );
          return {
            isBodyOpen: true,
            isFilesPanelOpen: true,
            inspectorTab: "runs",
            activeSubAgentRun: run,
            ...setOrganization(state, organizationId, {
              ...proj,
              focusedTabId: tabKey,
              tabs,
            }),
          };
        }),

      openDraftTab: (organizationId) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const existingDraft = proj.tabs.find((t) => t.chatId === null);
          if (existingDraft) {
            const projChange =
              proj.focusedTabId === existingDraft.tabKey
                ? {}
                : setOrganization(state, organizationId, {
                    ...proj,
                    focusedTabId: existingDraft.tabKey,
                  });
            return { isBodyOpen: true, ...projChange };
          }
          const entry: TabEntry = {
            chatId: null,
            pending: null,
            sendError: null,
            size: "popup",
            tabKey: makeTabKey(),
            title: "New chat",
          };
          return {
            isBodyOpen: true,
            ...setOrganization(state, organizationId, {
              focusedTabId: entry.tabKey,
              tabs: [...proj.tabs, entry],
            }),
          };
        }),

      openTab: (organizationId, chatId, title) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const existing = proj.tabs.find((t) => t.chatId === chatId);
          if (existing) {
            // Focusing a real chat discards any unsent draft.
            return setOrganization(state, organizationId, {
              focusedTabId: existing.tabKey,
              tabs: dropDraftsExcept(proj, existing.tabKey),
            });
          }
          const entry: TabEntry = {
            chatId,
            pending: null,
            sendError: null,
            size: "popup",
            tabKey: makeTabKey(),
            title,
          };
          return setOrganization(state, organizationId, {
            focusedTabId: entry.tabKey,
            tabs: [...proj.tabs.filter((t) => t.chatId !== null), entry],
          });
        }),

      upgradeTab: (organizationId, tabKey, chatId, title) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const tab = proj.tabs.find((t) => t.tabKey === tabKey);
          if (!tab) {
            return {};
          }
          const tabs = proj.tabs.map((t) =>
            t.tabKey === tabKey ? { ...t, chatId, title } : t
          );
          return setOrganization(state, organizationId, { ...proj, tabs });
        }),

      setPending: (organizationId, tabKey, pending) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const tab = proj.tabs.find((t) => t.tabKey === tabKey);
          if (!tab) {
            return {};
          }
          const tabs = proj.tabs.map((t) =>
            t.tabKey === tabKey ? { ...t, pending } : t
          );
          return setOrganization(state, organizationId, { ...proj, tabs });
        }),

      clearPending: (organizationId, tabKey) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const tab = proj.tabs.find((t) => t.tabKey === tabKey);
          if (!tab || tab.pending === null) {
            return {};
          }
          const tabs = proj.tabs.map((t) =>
            t.tabKey === tabKey ? { ...t, pending: null, sendError: null } : t
          );
          return setOrganization(state, organizationId, { ...proj, tabs });
        }),

      setSendError: (organizationId, tabKey, error) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const tab = proj.tabs.find((t) => t.tabKey === tabKey);
          if (!tab || tab.sendError === error) {
            return {};
          }
          const tabs = proj.tabs.map((t) =>
            t.tabKey === tabKey ? { ...t, sendError: error } : t
          );
          return setOrganization(state, organizationId, { ...proj, tabs });
        }),

      clearSendError: (organizationId, tabKey) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const tab = proj.tabs.find((t) => t.tabKey === tabKey);
          if (!tab || tab.sendError === null) {
            return {};
          }
          const tabs = proj.tabs.map((t) =>
            t.tabKey === tabKey ? { ...t, sendError: null } : t
          );
          return setOrganization(state, organizationId, { ...proj, tabs });
        }),

      closeTab: (organizationId, tabKey) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const closedIdx = proj.tabs.findIndex((t) => t.tabKey === tabKey);
          if (closedIdx === -1) {
            return {};
          }
          const tabs = proj.tabs.filter((t) => t.tabKey !== tabKey);
          const neighbor =
            tabs[closedIdx]?.tabKey ?? tabs[closedIdx - 1]?.tabKey ?? null;
          const focusedTabId =
            proj.focusedTabId === tabKey ? neighbor : proj.focusedTabId;
          const bodyChange =
            tabs.length === 0 && state.isBodyOpen ? { isBodyOpen: false } : {};
          return {
            ...setOrganization(state, organizationId, { focusedTabId, tabs }),
            ...bodyChange,
          };
        }),

      focusTab: (organizationId, tabKey) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          // Focusing another tab discards any unsent draft (unless the draft
          // itself is the one being focused).
          const tabs = dropDraftsExcept(proj, tabKey);
          const tabsChanged = tabs.length !== proj.tabs.length;
          if (proj.focusedTabId === tabKey && !tabsChanged) {
            return {};
          }
          return setOrganization(state, organizationId, {
            focusedTabId: tabKey,
            tabs,
          });
        }),

      unfocusTab: (organizationId) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          if (proj.focusedTabId === null) {
            return {};
          }
          return setOrganization(state, organizationId, {
            ...proj,
            focusedTabId: null,
          });
        }),

      setTabSize: (organizationId, tabKey, size) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const tab = proj.tabs.find((t) => t.tabKey === tabKey);
          if (!tab || tab.size === size) {
            return {};
          }
          const tabs = proj.tabs.map((t) =>
            t.tabKey === tabKey ? { ...t, size } : t
          );
          // Every resize starts with the file viewer closed (closed-by-default
          // on expand; irrelevant but harmless when collapsing).
          return {
            isFilesPanelOpen: false,
            ...setOrganization(state, organizationId, { ...proj, tabs }),
          };
        }),

      reconcileChats: (organizationId, chats) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const byId = new Map(chats.map((c) => [c.id, c]));
          const tabs = proj.tabs
            .filter((t) => t.chatId === null || byId.has(t.chatId))
            .map((t) => {
              if (t.chatId === null) {
                return t;
              }
              const c = byId.get(t.chatId);
              return c && c.title !== t.title ? { ...t, title: c.title } : t;
            });
          const tabKeys = new Set(tabs.map((t) => t.tabKey));
          const focusedTabId =
            proj.focusedTabId && !tabKeys.has(proj.focusedTabId)
              ? null
              : proj.focusedTabId;
          const sameTabs =
            tabs.length === proj.tabs.length &&
            tabs.every((t, i) => t === proj.tabs[i]);
          const projChanged = !sameTabs || focusedTabId !== proj.focusedTabId;
          return {
            chatsByOrganization: {
              ...state.chatsByOrganization,
              [organizationId]: chats,
            },
            ...(projChanged
              ? setOrganization(state, organizationId, {
                  ...proj,
                  focusedTabId,
                  tabs,
                })
              : {}),
          };
        }),
    }),
    {
      name: "sfab.chatTabs.v6",
      partialize: (state) => ({
        byOrganization: Object.fromEntries(
          Object.entries(state.byOrganization).map(([organizationId, proj]) => {
            const tabs = proj.tabs
              .filter((t) => t.chatId !== null)
              .map((t) =>
                t.pending === null && t.sendError === null
                  ? t
                  : { ...t, pending: null, sendError: null }
              );
            const tabKeys = new Set(tabs.map((t) => t.tabKey));
            const focusedTabId =
              proj.focusedTabId && tabKeys.has(proj.focusedTabId)
                ? proj.focusedTabId
                : null;
            return [organizationId, { focusedTabId, tabs }];
          })
        ),
      }),
    }
  )
);

const EMPTY_TABS: TabEntry[] = [];
const EMPTY_CHATS: ChatSummary[] = [];

export const useTabs = (organizationId: string) =>
  useChatTabsStore((s) => s.byOrganization[organizationId]?.tabs ?? EMPTY_TABS);

export const useFocusedTabId = (organizationId: string): string | null =>
  useChatTabsStore(
    (s) => s.byOrganization[organizationId]?.focusedTabId ?? null
  );

export const useChats = (organizationId: string) =>
  useChatTabsStore((s) => s.chatsByOrganization[organizationId] ?? EMPTY_CHATS);

export const useTab = (
  organizationId: string,
  tabKey: string
): TabEntry | null =>
  useChatTabsStore(
    (s) =>
      s.byOrganization[organizationId]?.tabs.find((t) => t.tabKey === tabKey) ??
      null
  );

export type SendableUserMessage = Parameters<ChatHelpers["sendMessage"]>[0];

export function toSendableMessage(
  message: OutgoingMessage
): SendableUserMessage {
  return message as SendableUserMessage;
}
