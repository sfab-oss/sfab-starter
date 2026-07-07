"use client";

import { useCallback, useState } from "react";

export type ChatSidePanelTool = "files" | "browser" | "terminal";

export type ChatSidePanelTab =
  | { id: string; type: ChatSidePanelTool }
  | { id: string; type: "file"; path: string; name: string };

/**
 * Pass `initialTool` to open the panel with that tool already active on first
 * paint (the chat dock seeds `"files"` when it expands, so the workspace viewer
 * is visible immediately). The seed id is fixed so the initializer stays stable.
 */
export function useChatSidePanel(initialTool?: ChatSidePanelTool) {
  const [panelOpen, setPanelOpen] = useState(Boolean(initialTool));
  const [tabs, setTabs] = useState<ChatSidePanelTab[]>(
    initialTool ? [{ id: `seed-${initialTool}`, type: initialTool }] : []
  );
  const [activeTabId, setActiveTabId] = useState<string | null>(
    initialTool ? `seed-${initialTool}` : null
  );

  const openPanel = useCallback(() => {
    setPanelOpen(true);
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setTabs([]);
    setActiveTabId(null);
  }, []);

  const togglePanel = useCallback(() => {
    if (panelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }, [closePanel, openPanel, panelOpen]);

  const openToolTab = useCallback(
    (tool: ChatSidePanelTool) => {
      setPanelOpen(true);
      const existing = tabs.find((tab) => tab.type === tool);
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }

      const id = crypto.randomUUID();
      setTabs((current) => [...current, { id, type: tool }]);
      setActiveTabId(id);
    },
    [tabs]
  );

  const closeTab = useCallback(
    (tabId: string) => {
      const closedIndex = tabs.findIndex((tab) => tab.id === tabId);
      const next = tabs.filter((tab) => tab.id !== tabId);
      setTabs(next);
      if (activeTabId === tabId) {
        const fallback = next[closedIndex] ?? next[closedIndex - 1];
        setActiveTabId(fallback?.id ?? null);
      }
    },
    [activeTabId, tabs]
  );

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  return {
    panelOpen,
    tabs,
    activeTab,
    activeTabId,
    openPanel,
    closePanel,
    togglePanel,
    openToolTab,
    closeTab,
    setActiveTabId,
  };
}
