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
import { ChatSidePanel } from "@/components/chat/side-panel/chat-side-panel";
import { MobileFilesSheet } from "@/components/chat/side-panel/mobile-files-sheet";
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
  const isMobile = useIsMobile();
  const isFilesPanelOpen = useChatTabsStore((s) => s.isFilesPanelOpen);
  const closeFilesPanel = useChatTabsStore((s) => s.closeFilesPanel);
  const isHidden = bodyState === "none";
  // Files viewer: a side panel on desktop when expanded, a bottom sheet on
  // mobile. Both are driven by the same `isFilesPanelOpen` flag.
  const showDesktopPanel =
    !isMobile && bodyState === "fullscreen" && isFilesPanelOpen;

  return (
    <>
      <DockBodyShell hidden={isHidden} state={bodyState}>
        {/* Conversation column — a stable element so switching tabs or toggling
            the file panel never remounts the live chat connections. */}
        <div className="flex min-w-0 flex-1 flex-col">
          {tabs.map((t) => (
            <PanelSlot hidden={focusedTabId !== t.tabKey} key={t.tabKey}>
              <ChatWindow tabKey={t.tabKey} />
            </PanelSlot>
          ))}
        </div>
        {showDesktopPanel ? (
          <div className="h-full w-[38%] min-w-[320px] max-w-[560px] shrink-0 border-l">
            <ChatSidePanel onClosePanel={closeFilesPanel} />
          </div>
        ) : null}
      </DockBodyShell>
      {isMobile ? (
        <MobileFilesSheet
          onOpenChange={(open) => {
            if (!open) {
              closeFilesPanel();
            }
          }}
          open={isFilesPanelOpen}
        />
      ) : null}
    </>
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
        "absolute z-30 flex overflow-hidden bg-background",
        isMobile && state === "fullscreen" ? null : "rounded-xl",
        state === "popup" ? popupClass : fullscreenClass
      )}
      hidden={hidden}
    >
      {children}
    </div>
  );
}

const MAX_VISIBLE_PILLS = 4;

function DockBar() {
  const { organizationId } = useChatOrgConnection();
  const tabs = useTabs(organizationId);
  const isMobile = useIsMobile();

  if (isMobile) {
    return null;
  }

  // Drafts have no pill — they show only as the focused window until the first
  // message promotes them into a real chat. Cap the pill row and collapse the
  // oldest tabs into a "+N" menu so it never overflows the footer width.
  const pillTabs = tabs.filter((t) => t.chatId !== null);
  const overflow =
    pillTabs.length > MAX_VISIBLE_PILLS
      ? pillTabs.slice(0, pillTabs.length - MAX_VISIBLE_PILLS)
      : [];
  const visible =
    pillTabs.length > MAX_VISIBLE_PILLS
      ? pillTabs.slice(pillTabs.length - MAX_VISIBLE_PILLS)
      : pillTabs;

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 bg-transparent px-2">
      <div className="flex min-w-0 flex-1 overflow-x-auto">
        <div className="ml-auto flex items-center gap-1">
          {overflow.length > 0 ? <OverflowMenu tabs={overflow} /> : null}
          {visible.map((t) => (
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

function OverflowMenu({ tabs }: { tabs: TabEntry[] }) {
  const { organizationId } = useChatOrgConnection();
  const focusedTabId = useFocusedTabId(organizationId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`${tabs.length} more chats`}
          className="h-7 shrink-0 rounded-md px-2 text-muted-foreground text-xs"
          size="sm"
          variant="ghost"
        >
          +{tabs.length}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="top">
        {tabs.map((tab) => (
          <DropdownMenuItem
            className="group flex items-center gap-2"
            key={tab.tabKey}
            onSelect={() => {
              const store = useChatTabsStore.getState();
              store.focusTab(organizationId, tab.tabKey);
              store.openBody();
            }}
          >
            <BotIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{tab.title}</span>
            <button
              aria-label={`Close ${tab.title}`}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                useChatTabsStore
                  .getState()
                  .closeTab(organizationId, tab.tabKey);
              }}
              type="button"
            >
              <XIcon className="size-3" />
            </button>
            {focusedTabId === tab.tabKey ? (
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
