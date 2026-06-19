"use client";

import type { ChatSummary } from "@workspace/agent/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/shadcn/sheet";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";
import {
  BotIcon,
  HistoryIcon,
  MessagesSquareIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { type MouseEvent, useEffect, useState } from "react";
import { useChatOrgConnection } from "@/components/chat/connection/chat-org-connection";
import {
  type TabEntry,
  useChatTabsStore,
  useFocusedTabId,
  useTabs,
} from "@/components/chat/dock/chat-tabs-store";
import {
  openOrgChatTab,
  useOrgChatHistory,
} from "@/components/chat/history/chat-history-sections";
import {
  chatHistoryTimestamp,
  HistoryListRow,
  HistorySheetSectionLabel,
} from "@/components/chat/history/history-list-row";
import { ChatHistoryError } from "@/components/chat/placeholders";

export function MobileChatFab() {
  const isMobile = useIsMobile();
  const isBodyOpen = useChatTabsStore((s) => s.isBodyOpen);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    if (isBodyOpen) {
      setIsExpanded(false);
    }
  }, [isBodyOpen]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded]);

  if (!isMobile || isBodyOpen) {
    return null;
  }

  return (
    <>
      {isExpanded && (
        <button
          aria-label="Close chat menu"
          className="fixed inset-0 z-30 bg-transparent"
          onClick={() => setIsExpanded(false)}
          type="button"
        />
      )}
      <FabStack
        isExpanded={isExpanded}
        onCollapse={() => setIsExpanded(false)}
        onOpenHistory={() => {
          setIsExpanded(false);
          setIsHistoryOpen(true);
        }}
        onToggle={() => setIsExpanded((value) => !value)}
      />
      <HistorySheet onOpenChange={setIsHistoryOpen} open={isHistoryOpen} />
    </>
  );
}

function FabStack({
  isExpanded,
  onCollapse,
  onOpenHistory,
  onToggle,
}: {
  isExpanded: boolean;
  onCollapse: () => void;
  onOpenHistory: () => void;
  onToggle: () => void;
}) {
  const { organizationId } = useChatOrgConnection();
  const tabs = useTabs(organizationId);
  const focusedTabId = useFocusedTabId(organizationId);

  const handlePickTab = (tabKey: string) => {
    const store = useChatTabsStore.getState();
    store.focusTab(organizationId, tabKey);
    store.openBody();
    onCollapse();
  };

  const handleNewChat = () => {
    useChatTabsStore.getState().openDraftTab(organizationId);
    onCollapse();
  };

  return (
    <div className="fixed right-4 bottom-4 z-40 flex flex-col items-end gap-2">
      {isExpanded && (
        <div className="flex flex-col items-end gap-2">
          {tabs.map((tab) => (
            <TabBubble
              isFocused={tab.tabKey === focusedTabId}
              key={tab.tabKey}
              onPick={() => handlePickTab(tab.tabKey)}
              organizationId={organizationId}
              tab={tab}
            />
          ))}
          <SecondaryBubble
            label="New chat"
            onClick={handleNewChat}
            tone="accent"
          >
            <PlusIcon className="size-5" />
          </SecondaryBubble>
          <SecondaryBubble label="History" onClick={onOpenHistory}>
            <HistoryIcon className="size-5" />
          </SecondaryBubble>
        </div>
      )}
      <PrimaryFab
        isExpanded={isExpanded}
        onClick={onToggle}
        tabCount={tabs.length}
      />
    </div>
  );
}

function PrimaryFab({
  isExpanded,
  onClick,
  tabCount,
}: {
  isExpanded: boolean;
  onClick: () => void;
  tabCount: number;
}) {
  return (
    <button
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Close chat menu" : "Open chat menu"}
      className="relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
      onClick={onClick}
      type="button"
    >
      {isExpanded ? (
        <XIcon className="size-6" />
      ) : (
        <MessagesSquareIcon className="size-6" />
      )}
      {tabCount > 0 && !isExpanded && (
        <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive font-medium text-[10px] text-destructive-foreground">
          {tabCount > 9 ? "9+" : tabCount}
        </span>
      )}
    </button>
  );
}

function TabBubble({
  isFocused,
  onPick,
  organizationId,
  tab,
}: {
  isFocused: boolean;
  onPick: () => void;
  organizationId: string;
  tab: TabEntry;
}) {
  const handleClose = (event: MouseEvent) => {
    event.stopPropagation();
    useChatTabsStore.getState().closeTab(organizationId, tab.tabKey);
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "max-w-[180px] truncate rounded-full px-3 py-1.5 text-sm shadow-md",
          isFocused
            ? "bg-foreground text-background"
            : "bg-background text-foreground"
        )}
      >
        {tab.title}
      </span>
      <div className="relative">
        <button
          aria-label={`Open ${tab.title}`}
          className={cn(
            "flex size-11 items-center justify-center rounded-full shadow-md transition-transform active:scale-95",
            isFocused
              ? "bg-foreground text-background"
              : "bg-background text-foreground"
          )}
          onClick={onPick}
          type="button"
        >
          <BotIcon className="size-5" />
        </button>
        <button
          aria-label={`Close ${tab.title}`}
          className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow"
          onClick={handleClose}
          type="button"
        >
          <XIcon className="size-3" />
        </button>
      </div>
    </div>
  );
}

function SecondaryBubble({
  children,
  label,
  onClick,
  tone = "neutral",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "neutral" | "accent";
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full bg-background px-3 py-1.5 text-foreground text-sm shadow-md">
        {label}
      </span>
      <button
        aria-label={label}
        className={cn(
          "flex size-11 items-center justify-center rounded-full shadow-md transition-transform active:scale-95",
          tone === "accent"
            ? "bg-primary text-primary-foreground"
            : "bg-background text-foreground"
        )}
        onClick={onClick}
        type="button"
      >
        {children}
      </button>
    </div>
  );
}

function HistorySheetBody({
  chats,
  historyLoadState,
  onDelete,
  onPickChat,
}: {
  chats: ChatSummary[];
  historyLoadState: "loading" | "ready" | "error";
  onDelete: (chatId: string, event: MouseEvent) => void;
  onPickChat: (chat: ChatSummary) => void;
}) {
  if (historyLoadState === "error") {
    return <ChatHistoryError />;
  }
  if (chats.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground text-sm">
        No chats yet.
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {chats.map((chat) => (
        <li
          className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent"
          key={chat.id}
        >
          <button
            className="flex min-w-0 flex-1 text-left"
            onClick={() => onPickChat(chat)}
            type="button"
          >
            <HistoryListRow
              icon={BotIcon}
              iconClassName="size-4"
              timestamp={chatHistoryTimestamp(chat)}
              title={chat.title}
              titleClassName="text-sm"
            />
          </button>
          <button
            aria-label={`Delete ${chat.title}`}
            className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => onDelete(chat.id, event)}
            type="button"
          >
            <Trash2Icon className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function HistorySheet({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const { organizationId, deleteChat, historyLoadState } =
    useChatOrgConnection();
  const chats = useOrgChatHistory();

  const handlePickChat = (chat: ChatSummary) => {
    openOrgChatTab(organizationId, chat);
    onOpenChange(false);
  };

  const handleDelete = (chatId: string, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    deleteChat(chatId);
  };

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="max-h-[80vh] rounded-t-2xl" side="bottom">
        <SheetHeader>
          <SheetTitle>History</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <HistorySheetSectionLabel />
          <HistorySheetBody
            chats={chats}
            historyLoadState={historyLoadState}
            onDelete={handleDelete}
            onPickChat={handlePickChat}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
