"use client";

import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { useChatTabsStore, useFocusedTabId } from "./chat-tabs-store";

export type DockBodyState = "none" | "popup" | "fullscreen";

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
