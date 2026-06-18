"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/shadcn/tooltip";
import { BrainIcon } from "lucide-react";
import { useState } from "react";
import { MemoryCard } from "./memory-card";

/**
 * Controlled organization-memory dialog. Read-only. `MemoryCard` is only mounted
 * while open, so it refetches the latest memory each time (the agent may have
 * updated it mid-conversation via `set_context`).
 */
export function MemoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col overflow-hidden">
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

/**
 * Self-contained brain-icon button + memory dialog, for surfaces that want a
 * standalone affordance rather than driving the dialog from a menu.
 */
export function MemoryDialogButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="size-7"
            onClick={() => setOpen(true)}
            size="icon"
            variant="ghost"
          >
            <BrainIcon className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Organization memory</TooltipContent>
      </Tooltip>
      <MemoryDialog onOpenChange={setOpen} open={open} />
    </>
  );
}
