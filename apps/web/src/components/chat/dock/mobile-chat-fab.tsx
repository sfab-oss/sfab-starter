"use client";

import type { ChatSummary } from "@workspace/agent/types";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/shadcn/drawer";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";
import {
  BotIcon,
  HistoryIcon,
  MessagesSquareIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { type MouseEvent, useState } from "react";
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
import { m } from "@/paraglide/messages.js";

/**
 * Mobile launcher — a slim footer bar (replacing the old floating FAB) shown
 * whenever the chat body is closed. Surfaces the most-recent chat for one-tap
 * reopen plus an Ask button, with the rest of the open chats and full history
 * tucked into drawers. When a chat is open, the fullscreen chat body covers
 * this bar.
 */
export function MobileChatFab() {
  const isMobile = useIsMobile();
  const isBodyOpen = useChatTabsStore((s) => s.isBodyOpen);

  if (!isMobile || isBodyOpen) {
    return null;
  }
  return <LauncherRow />;
}

function LauncherRow() {
  const { organizationId } = useChatOrgConnection();
  const tabs = useTabs(organizationId);
  // Drafts have no pill; the launcher only surfaces real, sent chats.
  const openChats = tabs.filter((t) => t.chatId !== null);
  const recent = openChats.at(-1) ?? null;
  const hasOthers = openChats.length > 1;

  const openRecent = () => {
    if (!recent) {
      return;
    }
    const store = useChatTabsStore.getState();
    store.focusTab(organizationId, recent.tabKey);
    store.openBody();
  };

  const ask = () => {
    useChatTabsStore.getState().openDraftTab(organizationId);
  };

  return (
    <div className="flex w-full items-center gap-2 px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      {hasOthers ? <MobileChatsButton count={openChats.length} /> : null}
      {recent ? (
        <>
          <button
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border bg-background px-4 text-left text-sm shadow-sm"
            onClick={openRecent}
            type="button"
          >
            <BotIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{recent.title}</span>
          </button>
          <Button
            aria-label={m.chat_ask_assistant()}
            className="size-10 shrink-0 rounded-full"
            onClick={ask}
            size="icon"
          >
            <SparklesIcon className="size-4" />
          </Button>
        </>
      ) : (
        <Button className="h-10 flex-1 gap-2 rounded-full" onClick={ask}>
          <SparklesIcon className="size-4" />
          {m.chat_ask_assistant()}
        </Button>
      )}
      <MobileHistoryButton />
    </div>
  );
}

function MobileChatsButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const { organizationId } = useChatOrgConnection();
  const tabs = useTabs(organizationId);
  const focusedTabId = useFocusedTabId(organizationId);
  const openChats = tabs.filter((t) => t.chatId !== null);

  const pick = (tabKey: string) => {
    const store = useChatTabsStore.getState();
    store.focusTab(organizationId, tabKey);
    store.openBody();
    setOpen(false);
  };

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <DrawerTrigger asChild>
        <button
          aria-label={m.chat_open_chats_count({ count })}
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm"
          type="button"
        >
          <MessagesSquareIcon className="size-4" />
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary font-medium text-[10px] text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{m.chat_open_chats()}</DrawerTitle>
        </DrawerHeader>
        <div className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto px-2 pb-6">
          {[...openChats].reverse().map((tab) => (
            <MobileChatRow
              isFocused={tab.tabKey === focusedTabId}
              key={tab.tabKey}
              onClose={() =>
                useChatTabsStore.getState().closeTab(organizationId, tab.tabKey)
              }
              onPick={() => pick(tab.tabKey)}
              tab={tab}
            />
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function MobileChatRow({
  isFocused,
  onClose,
  onPick,
  tab,
}: {
  isFocused: boolean;
  onClose: () => void;
  onPick: () => void;
  tab: TabEntry;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg pr-1",
        isFocused ? "bg-muted" : ""
      )}
    >
      <button
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 px-3 text-left"
        onClick={onPick}
        type="button"
      >
        <BotIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm">{tab.title}</span>
      </button>
      <button
        aria-label={m.chat_close_tab({ title: tab.title })}
        className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:text-destructive"
        onClick={onClose}
        type="button"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}

function MobileHistoryButton() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <DrawerTrigger asChild>
        <button
          aria-label={m.chat_history()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm"
          type="button"
        >
          <HistoryIcon className="size-4" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{m.chat_history()}</DrawerTitle>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <HistorySheetSectionLabel />
          <MobileHistoryBody onSelected={() => setOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function MobileHistoryBody({ onSelected }: { onSelected: () => void }) {
  const { organizationId, deleteChat, historyLoadState } =
    useChatOrgConnection();
  const chats = useOrgChatHistory();

  const handlePickChat = (chat: ChatSummary) => {
    openOrgChatTab(organizationId, chat);
    onSelected();
  };

  const handleDelete = (chatId: string, event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    deleteChat(chatId);
  };

  if (historyLoadState === "error") {
    return <ChatHistoryError />;
  }
  if (chats.length === 0) {
    return (
      <div className="py-4 text-center text-muted-foreground text-sm">
        {m.chat_no_chats_yet()}
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
            className="flex min-h-11 min-w-0 flex-1 text-left"
            onClick={() => handlePickChat(chat)}
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
            aria-label={m.chat_delete({ title: chat.title })}
            className="flex size-11 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={(event) => handleDelete(chat.id, event)}
            type="button"
          >
            <Trash2Icon className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
