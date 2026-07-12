"use client";

import type { ChatSummary } from "@workspace/agent/types";
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { cn } from "@workspace/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatHistoryTimestamp } from "@/lib/shared/format/format-history-timestamp";
import { m } from "@/paraglide/messages.js";

export function chatHistoryTimestamp(
  chat: Pick<ChatSummary, "createdAt" | "updatedAt">
): string {
  return formatHistoryTimestamp(chat.updatedAt ?? chat.createdAt);
}

export function HistoryDropdownSectionLabel() {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel className="text-muted-foreground text-xs">
        {m.chat_history_section()}
      </DropdownMenuLabel>
    </DropdownMenuGroup>
  );
}

export function HistorySheetSectionLabel() {
  return (
    <p className="mb-2 text-muted-foreground text-xs">
      {m.chat_history_section()}
    </p>
  );
}

export function HistoryListRow({
  icon: Icon,
  title,
  subtitle,
  timestamp,
  trailing,
  iconClassName,
  titleClassName,
  className,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  timestamp: string;
  trailing?: ReactNode;
  iconClassName?: string;
  titleClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-2", className)}>
      <Icon
        className={cn("size-3.5 shrink-0 text-muted-foreground", iconClassName)}
      />
      <div className="min-w-0 flex-1">
        <span className={cn("block truncate", titleClassName)}>{title}</span>
        {subtitle ? (
          <span className="block truncate text-muted-foreground text-xs">
            {subtitle}
          </span>
        ) : null}
      </div>
      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
        {timestamp}
      </span>
      {trailing}
    </div>
  );
}
