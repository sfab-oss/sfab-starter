"use client";

import type { ChatContext } from "@workspace/contract/ai";
import {
  ChatToken,
  ChatTokenAction,
  ChatTokenIcon,
  ChatTokenLabel,
  ChatTokenRemove,
} from "@workspace/ui/components/shadcn/chat-token";
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Package, Pin, PinOff } from "lucide-react";

type PageConfig = NonNullable<ChatContext["page"]>;

export function iconForPageContext(config: PageConfig): LucideIcon {
  if (config.entityType === "product") {
    return Package;
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
      <button
        className="text-[11px] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={onRestore}
        type="button"
      >
        Add context
      </button>
    );
  }

  const Icon = iconForPageContext(context);
  const summary = summaryFrom(context);

  return (
    <ChatToken title={summary}>
      <ChatTokenIcon>
        <Icon aria-hidden="true" />
      </ChatTokenIcon>
      <ChatTokenLabel>{summary}</ChatTokenLabel>
      <ChatTokenAction
        aria-label={pinned ? "Unpin page context" : "Pin page context"}
        onClick={onPinToggle}
      >
        {pinned ? <PinOff /> : <Pin />}
      </ChatTokenAction>
      <ChatTokenRemove
        label="Remove page context from next message"
        onClick={onDismiss}
      />
    </ChatToken>
  );
}
