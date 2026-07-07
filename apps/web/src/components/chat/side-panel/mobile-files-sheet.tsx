"use client";

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@workspace/ui/components/shadcn/sheet";
import { ChatSidePanel } from "./chat-side-panel";

/**
 * Mobile workspace file viewer — a tall bottom sheet (~90dvh) rather than a
 * side-by-side panel. `data-[side=bottom]:h-[90dvh]` is required to beat the
 * SheetContent base `data-[side=bottom]:h-auto` (an attribute selector, so a
 * plain `h-*` won't win).
 */
export function MobileFilesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="flex w-full flex-col gap-0 rounded-t-xl p-0 data-[side=bottom]:h-[90dvh] sm:max-w-none"
        showCloseButton={false}
        side="bottom"
      >
        <SheetTitle className="sr-only">Workspace files</SheetTitle>
        <ChatSidePanel onClosePanel={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}
