"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
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
          <DialogTitle>Organization memory</DialogTitle>
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
