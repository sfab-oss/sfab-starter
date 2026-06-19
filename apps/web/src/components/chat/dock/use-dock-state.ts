"use client";

import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { useChatTabsStore, useFocusedTabId } from "./chat-tabs-store";

export type DockBodyState = "none" | "popup" | "fullscreen";

/**
 * Joins three signals into one:
 *   - the store's `isBodyOpen` (transient — reset on reload)
 *   - mobile viewport (forces fullscreen)
 *   - the focused tab's persisted `size` preference
 *
 * Returns `"none"` whenever the body should be hidden. The caller still
 * needs the separate "no focused tab" check to suppress empty bodies (the
 * bar can be open with no tabs); see `<DockBody>`.
 */
export function useDockBodyState(organizationId: string): DockBodyState {
  const isBodyOpen = useChatTabsStore((s) => s.isBodyOpen);
  const isMobile = useIsMobile();
  const focusedTabId = useFocusedTabId(organizationId);
  const focusedSize = useChatTabsStore((s) => {
    if (!focusedTabId) {
      return null;
    }
    return (
      s.byOrganization[organizationId]?.tabs.find(
        (t) => t.tabKey === focusedTabId
      )?.size ?? null
    );
  });

  if (!isBodyOpen) {
    return "none";
  }
  if (isMobile) {
    return "fullscreen";
  }
  return focusedSize ?? "popup";
}
