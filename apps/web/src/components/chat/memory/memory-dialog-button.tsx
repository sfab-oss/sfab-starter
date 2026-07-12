"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { m } from "@/paraglide/messages.js";
import { MemoryCard } from "./memory-card";

export function MemoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-lg sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>{m.chat_org_memory()}</DialogTitle>
          <DialogDescription>
            Durable facts the agent keeps for this organization — shared across
            every chat. The agent maintains it as you work.
          </DialogDescription>
        </DialogHeader>
        {open && <MemoryCard showHeader={false} variant="dialog" />}
      </DialogContent>
    </Dialog>
  );
}
