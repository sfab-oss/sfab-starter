"use client";

import type { ChatContext } from "@workspace/contract/ai";
import { cn } from "@workspace/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  Pin,
  PinOff,
  Warehouse,
  X,
} from "lucide-react";

type PageConfig = NonNullable<ChatContext["page"]>;

export function iconForPageContext(config: PageConfig): LucideIcon {
  if (config.entityType === "product") {
    return Package;
  }
  if (config.entityType === "warehouse") {
    return Warehouse;
  }
  return LayoutDashboard;
}

export function iconForPageContextMeta(meta: {
  page: string;
  params?: { entityType?: string };
}): LucideIcon {
  if (meta.params?.entityType === "product") {
    return Package;
  }
  if (meta.params?.entityType === "warehouse") {
    return Warehouse;
  }
  return LayoutDashboard;
}

function summaryFrom(config: PageConfig): string {
  return (
    config.title ?? config.description ?? config.entityType ?? "Current page"
  );
}

export interface PageContextChipProps {
  context: PageConfig | null;
  dismissed: boolean;
  onDismiss: () => void;
  onPinToggle: () => void;
  onRestore: () => void;
  pinned: boolean;
}

export function PageContextChip({
  context,
  dismissed,
  pinned,
  onDismiss,
  onPinToggle,
  onRestore,
}: PageContextChipProps) {
  if (dismissed || !context) {
    return (
      <div className="mb-2 flex items-center px-1">
        <button
          className="text-muted-foreground text-xs underline-offset-4 hover:text-foreground hover:underline"
          onClick={onRestore}
          type="button"
        >
          Add context
        </button>
      </div>
    );
  }

  const Icon = iconForPageContext(context);
  const summary = summaryFrom(context);

  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-muted-foreground text-xs"
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate" title={summary}>
        {summary}
      </span>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          aria-label={pinned ? "Unpin page context" : "Pin page context"}
          className="rounded p-0.5 hover:bg-muted hover:text-foreground"
          onClick={onPinToggle}
          type="button"
        >
          {pinned ? (
            <PinOff className="size-3.5" />
          ) : (
            <Pin className="size-3.5" />
          )}
        </button>
        <button
          aria-label="Remove page context from next message"
          className="rounded p-0.5 hover:bg-muted hover:text-foreground"
          onClick={onDismiss}
          type="button"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
