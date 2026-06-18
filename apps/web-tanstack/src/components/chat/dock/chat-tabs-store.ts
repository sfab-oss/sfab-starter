import type { useAgentChat } from "@cloudflare/ai-chat/react";
import type { ChatSummary } from "@workspace/agent/types";
import type { AIDataPart, AIMetadata } from "@workspace/types/ai";
import type { UIMessage } from "ai";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrgChatMessage = UIMessage<AIMetadata, AIDataPart>;

export type ChatHelpers = ReturnType<
  typeof useAgentChat<unknown, OrgChatMessage>
>;

/** Per-tab outgoing message metadata (page context only until send). */
export interface OutgoingMessage {
  metadata?: Pick<AIMetadata, "pageContext">;
  parts: OrgChatMessage["parts"];
  role: "user";
}

/** Per-tab body size preference. Persisted so reopening a minimized tab
 *  restores the size the user last left it at. Different tabs in the same
 *  organization can have different sizes. */
export type TabSize = "popup" | "fullscreen";

/**
 * One open chat tab. Drafts are first-class tabs with `chatId === null` —
 * the dock body branches on `tab.chatId` to render the draft composer vs.
 * the real WS-backed chat. On first send `<DraftWindow>` writes its message
 * to `tab.pending`, calls `createChat`, and `upgradeTab(...)` flips this
 * same entry's `chatId`/`title` in place. The `tabKey` is preserved across
 * the transition so the React slot stays put and the pending message rides
 * along on the entry — no cross-mount handoff needed.
 *
 * Invariant: at most one tab per organization may have `chatId === null`.
 * `openDraftTab` enforces this by focusing the existing draft if one
 * exists. Drafts are excluded from persistence by `partialize`.
 */
export interface TabEntry {
  /** `null` while the tab is in draft mode (no chat created yet). Becomes
   *  a real id once `upgradeTab` flips it. */
  chatId: string | null;
  /** Queued first message for a draft about to upgrade. Cleared by the
   *  connection layer once it lands on the WS. Lives on the entry (not in
   *  module state) so the draft→real transition keeps the same tab. */
  pending: OutgoingMessage | null;
  /** Last failed send. Set together with `pending` to render the inline
   *  retry pill; cleared on retry or next successful send. Not persisted. */
  sendError: string | null;
  size: TabSize;
  tabKey: string;
  title: string;
}

interface OrganizationTabsState {
  /** `tabKey` of the focused tab, or `null` when there's nothing to show
   *  (no tabs open, or every tab was just closed). A draft is just a tab
   *  with `chatId === null` — `focusedTabId === null` never means "draft
   *  mode" anymore. */
  focusedTabId: string | null;
  tabs: TabEntry[];
}

interface ChatTabsState {
  /** Persisted UI state per organization: open tabs and which one is focused. */
  byOrganization: Record<string, OrganizationTabsState>;
  /** Server-fetched chats registry per organization. Not persisted — refreshed on
   *  connection. Keyed separately from `byOrganization` so we can hydrate tabs
   *  from storage instantly and reconcile titles when the registry arrives. */
  chatsByOrganization: Record<string, ChatSummary[]>;
  /** Clear a tab's pending message after the connection layer drains it. */
  clearPending: (organizationId: string, tabKey: string) => void;
  /** Clear a tab's send error. Called by the inline Retry button — `pending`
   *  stays set so the retry re-fires the same flow. */
  clearSendError: (organizationId: string, tabKey: string) => void;
  closeBody: () => void;
  closeTab: (organizationId: string, tabKey: string) => void;
  focusTab: (organizationId: string, tabKey: string) => void;
  /** Whether the dock body is currently visible. NOT persisted (excluded
   *  from `partialize`) so reload always starts collapsed regardless of
   *  what was open last session. */
  isBodyOpen: boolean;
  openBody: () => void;
  /** Open a draft tab. If a draft tab already exists for this organization,
   *  focus it instead of creating a second one. Opens the body. */
  openDraftTab: (organizationId: string) => void;
  /** Add a real-chat tab (or refocus if already open). */
  openTab: (organizationId: string, chatId: string, title: string) => void;
  /** Replace the chats registry for an organization and prune real tabs whose
   *  chat no longer exists. Drafts (`chatId === null`) are left alone.
   *  Updates titles on existing real tabs to match the registry. */
  reconcileChats: (organizationId: string, chats: ChatSummary[]) => void;
  /** Stash a tab's outgoing message until the connection layer can send
   *  it. For drafts, this carries across the draft→real upgrade so the
   *  React tree doesn't need a module-level handoff. */
  setPending: (
    organizationId: string,
    tabKey: string,
    pending: OutgoingMessage
  ) => void;
  /** Record a failed send so the message area can render an inline retry
   *  pill. Doesn't clear `pending` — Retry re-uses the same message. */
  setSendError: (organizationId: string, tabKey: string, error: string) => void;
  /** Update the persisted body size for a single tab. */
  setTabSize: (organizationId: string, tabKey: string, size: TabSize) => void;
  unfocusTab: (organizationId: string) => void;
  /** Flip a draft tab to a real tab in place. Preserves `tabKey`, `size`,
   *  and `pending` so the React slot doesn't unmount and the queued
   *  message survives the transition. */
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

export const useChatTabsStore = create<ChatTabsState>()(
  persist(
    (set) => ({
      byOrganization: {},
      chatsByOrganization: {},
      isBodyOpen: false,

      openBody: () => set({ isBodyOpen: true }),
      closeBody: () => set({ isBodyOpen: false }),

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
            return setOrganization(state, organizationId, {
              ...proj,
              focusedTabId: existing.tabKey,
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
            tabs: [...proj.tabs, entry],
          });
        }),

      upgradeTab: (organizationId, tabKey, chatId, title) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const tab = proj.tabs.find((t) => t.tabKey === tabKey);
          // Tab gone (user closed mid-flight) — the chat exists on the
          // server and is reachable via history; nothing more to do here.
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
          // If the closed tab was focused, hand focus to the right neighbor;
          // if there was no right neighbor, the left one. After filtering, the
          // right neighbor of the closed tab sits at `closedIdx`.
          const neighbor =
            tabs[closedIdx]?.tabKey ?? tabs[closedIdx - 1]?.tabKey ?? null;
          const focusedTabId =
            proj.focusedTabId === tabKey ? neighbor : proj.focusedTabId;
          // Closing the last tab leaves `focusedTabId === null` and an empty
          // tabs array — `<DockBody>` renders no slot, which is the right
          // "nothing visible" signal. We also close the body so the user
          // doesn't see an empty floating panel; a fresh draft requires an
          // explicit `+` action.
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
          if (proj.focusedTabId === tabKey) {
            return {};
          }
          return setOrganization(state, organizationId, {
            ...proj,
            focusedTabId: tabKey,
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
          return setOrganization(state, organizationId, { ...proj, tabs });
        }),

      reconcileChats: (organizationId, chats) =>
        set((state) => {
          const proj = getOrganization(state, organizationId);
          const byId = new Map(chats.map((c) => [c.id, c]));
          // Drafts (chatId === null) aren't in the registry yet — leave
          // them untouched so a fresh draft doesn't get pruned the moment
          // listChats returns. Only real tabs get the existence + title
          // reconciliation pass.
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
      // v6: Renamed `byProject` → `byOrganization` and dropped `TabKind`.
      // Bump the key so old blobs are dropped.
      name: "sfab.chatTabs.v6",
      // Drafts don't survive reload — matches the pre-refactor "drafts are
      // ephemeral" UX. Strip draft tabs out before persisting, re-point
      // `focusedTabId` if it was on a draft, and null out `pending` /
      // `sendError` on surviving tabs (transient state from a half-finished
      // send is not useful after a reload).
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

// ── Selector hooks ────────────────────────────────────────────────────

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

/** Single cast boundary for OutgoingMessage → SDK sendMessage input. */
export function toSendableMessage(
  message: OutgoingMessage
): SendableUserMessage {
  return message as SendableUserMessage;
}
