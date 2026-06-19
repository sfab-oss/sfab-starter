"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/shadcn/tooltip";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";
import {
  BotIcon,
  HistoryIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useChatOrgConnection } from "@/components/chat/connection/chat-org-connection";
import {
  type TabEntry,
  useChatTabsStore,
  useFocusedTabId,
  useTabs,
} from "@/components/chat/dock/chat-tabs-store";
import { MobileChatFab } from "@/components/chat/dock/mobile-chat-fab";
import {
  type DockBodyState,
  useDockBodyState,
} from "@/components/chat/dock/use-dock-state";
import {
  openOrgChatTab,
  useOrgChatHistory,
} from "@/components/chat/history/chat-history-sections";
import {
  chatHistoryTimestamp,
  HistoryDropdownSectionLabel,
  HistoryListRow,
} from "@/components/chat/history/history-list-row";
import { ChatHistoryError } from "@/components/chat/placeholders";
import { ChatErrorBoundary } from "@/components/chat/window/chat-error-boundary";
import { ChatWindow } from "@/components/chat/window/chat-window";

export function BottomChatDock() {
  return (
    <>
      <ChatErrorBoundary fallback="silent">
        <DockBody />
      </ChatErrorBoundary>
      <ChatErrorBoundary>
        <DockBar />
      </ChatErrorBoundary>
      <ChatErrorBoundary fallback="silent">
        <MobileChatFab />
      </ChatErrorBoundary>
    </>
  );
}

function DockBody() {
  const { organizationId } = useChatOrgConnection();
  const bodyState = useDockBodyState(organizationId);
  const tabs = useTabs(organizationId);
  const focusedTabId = useFocusedTabId(organizationId);
  const isHidden = bodyState === "none";

  return (
    <DockBodyShell hidden={isHidden} state={bodyState}>
      {tabs.map((t) => (
        <PanelSlot hidden={focusedTabId !== t.tabKey} key={t.tabKey}>
          <ChatWindow tabKey={t.tabKey} />
        </PanelSlot>
      ))}
    </DockBodyShell>
  );
}

function PanelSlot({
  children,
  hidden,
}: {
  children: ReactNode;
  hidden: boolean;
}) {
  return (
    <div className="contents" hidden={hidden}>
      {children}
    </div>
  );
}

function DockBodyShell({
  children,
  hidden,
  state,
}: {
  children: ReactNode;
  hidden: boolean;
  state: DockBodyState;
}) {
  const isMobile = useIsMobile();
  const fullscreenClass = isMobile
    ? "inset-0"
    : "top-4 right-2 bottom-12 left-0 shadow-xl";
  const popupClass =
    "right-4 bottom-12 h-[640px] max-h-[calc(100%-4rem)] w-[480px] max-w-[calc(100%-2rem)] border shadow-2xl";

  return (
    <div
      className={cn(
        "absolute z-30 flex flex-col overflow-hidden bg-background",
        isMobile && state === "fullscreen" ? null : "rounded-xl",
        state === "popup" ? popupClass : fullscreenClass
      )}
      hidden={hidden}
    >
      {children}
    </div>
  );
}

function DockBar() {
  const { organizationId } = useChatOrgConnection();
  const tabs = useTabs(organizationId);
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 bg-transparent px-2">
      <div className="flex min-w-0 flex-1 overflow-x-auto">
        <div className="ml-auto flex items-center gap-1">
          {tabs.map((t) => (
            <ChatTab key={t.tabKey} tab={t} />
          ))}
        </div>
      </div>
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="New chat"
              className="size-7 shrink-0"
              onClick={() =>
                useChatTabsStore.getState().openDraftTab(organizationId)
              }
              size="icon"
              variant="ghost"
            >
              <PlusIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">New chat</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <HistoryDropdown />
    </div>
  );
}

function ChatTab({ tab }: { tab: TabEntry }) {
  const { organizationId } = useChatOrgConnection();
  const focusedTabId = useFocusedTabId(organizationId);
  const isFocused = focusedTabId === tab.tabKey;

  const handleClick = () => {
    const store = useChatTabsStore.getState();
    if (!store.isBodyOpen) {
      store.focusTab(organizationId, tab.tabKey);
      store.openBody();
      return;
    }
    if (isFocused) {
      store.closeBody();
      return;
    }
    store.focusTab(organizationId, tab.tabKey);
  };

  const handleClose = (event: MouseEvent) => {
    event.stopPropagation();
    useChatTabsStore.getState().closeTab(organizationId, tab.tabKey);
  };

  return (
    <div
      className={cn(
        "group flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2 text-sm transition-colors",
        isFocused
          ? "border-border bg-background text-foreground shadow-sm"
          : "border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground"
      )}
    >
      <button
        className="flex min-w-0 items-center gap-1.5"
        onClick={handleClick}
        type="button"
      >
        <BotIcon className="size-3.5 shrink-0" />
        <span className="max-w-[160px] truncate">{tab.title}</span>
      </button>
      <button
        aria-label={`Close ${tab.title}`}
        className="rounded p-0.5 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        onClick={handleClose}
        type="button"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );
}

function HistoryDropdownBody({
  chats,
  deleteChat,
  historyLoadState,
  organizationId,
}: {
  chats: ReturnType<typeof useOrgChatHistory>;
  deleteChat: (chatId: string) => Promise<void>;
  historyLoadState: "loading" | "ready" | "error";
  organizationId: string;
}) {
  if (historyLoadState === "error") {
    return <ChatHistoryError />;
  }
  if (chats.length === 0) {
    return (
      <div className="px-2 py-1.5 text-muted-foreground text-xs">
        No chats yet
      </div>
    );
  }
  return chats.map((chat) => (
    <DropdownMenuItem
      className="group flex items-center gap-2"
      key={chat.id}
      onSelect={() => openOrgChatTab(organizationId, chat)}
    >
      <HistoryListRow
        icon={BotIcon}
        timestamp={chatHistoryTimestamp(chat)}
        title={chat.title}
        trailing={
          <button
            aria-label={`Delete ${chat.title}`}
            className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteChat(chat.id);
            }}
            type="button"
          >
            <Trash2Icon className="size-3.5" />
          </button>
        }
      />
    </DropdownMenuItem>
  ));
}

function HistoryDropdown() {
  const { organizationId, deleteChat, historyLoadState } =
    useChatOrgConnection();
  const chats = useOrgChatHistory();

  return (
    <TooltipProvider delayDuration={300}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Chat history"
                className="size-7 shrink-0"
                size="icon"
                variant="ghost"
              >
                <HistoryIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">History</TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="end"
          className="max-h-96 w-80 overflow-y-auto"
        >
          <HistoryDropdownSectionLabel />
          <HistoryDropdownBody
            chats={chats}
            deleteChat={deleteChat}
            historyLoadState={historyLoadState}
            organizationId={organizationId}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
