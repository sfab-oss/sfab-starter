"use client";

import { useEffect } from "react";

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement)
  );
}

/** Toggle the command palette on ⌘K / Ctrl+K or `/` (platform sidebar pattern). */
export function useCommandPaletteShortcut(onToggle: () => void) {
  // biome-ignore lint/plugin/no-use-effect: DOM / window listener sync
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (isTypingTarget(e.target)) {
          return;
        }

        e.preventDefault();
        onToggle();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onToggle]);
}
