"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation";
import type { PromptInputMessage } from "@workspace/ui/components/ai-elements/prompt-input";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/shadcn/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/shadcn/popover";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/shadcn/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/shadcn/sheet";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";
import type { ChatStatus } from "ai";
import {
  BotIcon,
  ChevronDownIcon,
  ClipboardCopyIcon,
  FolderTreeIcon,
  HistoryIcon,
  MaximizeIcon,
  MessagesSquareIcon,
  MinimizeIcon,
  MinusIcon,
  MoreHorizontalIcon,
  PanelRightIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { useChatDock } from "../hooks/use-chat-dock";
import { useChatSidePanel } from "../hooks/use-chat-side-panel";
import type { GalleryChatMessage } from "../lib/mock-chat-messages";
import type { MockChat } from "../lib/mock-chats";
import { ChatHistoryPanel } from "./chat-history-panel";
import { GalleryChatInput } from "./chat-input";
import { ChatMessageRow } from "./chat-message-parts";
import { ChatSidePanel } from "./chat-side-panel";

type Dock = ReturnType<typeof useChatDock>;

/** How many chat pills stay inline before the rest collapse into a "+N" menu. */
const MAX_VISIBLE_PILLS = 4;

/**
 * Bottom-docked assistant as it would sit in an app route footer, modelled on
 * the multi-session dock: a footer bar of open-chat pills, a "new chat" action,
 * and a searchable history dropdown. The focused chat opens in a fixed panel
 * anchored to the bottom-right corner (it does not move with the pills), which
 * expands into a large view with the workspace file viewer.
 *
 * Preview/mock only — chats, threads, and the workspace tree are fixtures. The
 * real surface (ALW-401) swaps these for the live OrgChat connection + the
 * `listChats`/`createChat`/`readDir` OrgAgent RPC.
 */
export function ChatDock() {
  const dock = useChatDock();
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileDock dock={dock} />;
  }
  return <DesktopDock dock={dock} />;
}

/**
 * Desktop layout: an in-flow footer bar of pills plus a corner-anchored panel
 * that toggles between a compact popup and a large file view.
 */
function DesktopDock({ dock }: { dock: Dock }) {
  const focused = dock.focusedChat;

  return (
    <>
      <DockBar dock={dock} />
      {focused && dock.size === "popup" ? (
        <CompactWindow chat={focused} dock={dock} />
      ) : null}
      {focused && dock.size === "expanded" ? (
        <BigWindow chat={focused} dock={dock} />
      ) : null}
    </>
  );
}

function DockBar({ dock }: { dock: Dock }) {
  // In-flow footer row: it lives in the shell's `ShellFooter` slot, below and
  // OUTSIDE the rounded inset panel — not a fixed overlay. The focused chat
  // panel floats above the content, anchored to the corner (see CompactWindow).
  //
  // Pills stay newest-last; only the last few are shown inline, older ones
  // collapse into an overflow menu so the bar never overruns its width.
  const overflow = dock.openChats.slice(
    0,
    Math.max(0, dock.openChats.length - MAX_VISIBLE_PILLS)
  );
  const visible = dock.openChats.slice(-MAX_VISIBLE_PILLS);

  return (
    <div className="flex h-12 w-full items-center justify-end gap-2 px-3 md:px-4">
      <div className="flex min-w-0 items-center gap-1.5">
        {overflow.length > 0 ? (
          <OverflowMenu chats={overflow} dock={dock} />
        ) : null}
        {visible.map((chat) => (
          <ChatPill chat={chat} dock={dock} key={chat.id} />
        ))}
      </div>
      <Button
        className="h-8 shrink-0 gap-1.5 rounded-full pr-4 pl-3 shadow-sm"
        onClick={dock.newChat}
        type="button"
      >
        <SparklesIcon className="size-3.5" />
        <span className="font-medium text-sm">Ask the assistant</span>
      </Button>
      <HistoryButton dock={dock} />
    </div>
  );
}

function ChatPill({ chat, dock }: { chat: MockChat; dock: Dock }) {
  const isFocused = dock.focusedId === chat.id;

  return (
    <div className="group/pill relative shrink-0">
      <button
        className={cn(
          "inline-flex h-8 max-w-[200px] items-center gap-1.5 rounded-full border px-3 pr-6 text-sm shadow-sm transition-colors",
          isFocused
            ? "border-border bg-accent text-accent-foreground"
            : "border-border/60 bg-background text-muted-foreground hover:bg-accent/40 hover:text-foreground"
        )}
        onClick={() => (isFocused ? dock.minimize() : dock.focusChat(chat.id))}
        type="button"
      >
        <BotIcon className="size-3.5 shrink-0" />
        <span className="truncate">{chat.title}</span>
      </button>
      <button
        aria-label={`Close ${chat.title}`}
        className="absolute top-1/2 right-1.5 flex size-4 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground opacity-0 transition hover:bg-background hover:text-foreground group-hover/pill:opacity-100"
        onClick={() => dock.closeTab(chat.id)}
        type="button"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );
}

function OverflowMenu({ chats, dock }: { chats: MockChat[]; dock: Dock }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-8 shrink-0 rounded-full px-3 text-muted-foreground shadow-sm"
          type="button"
          variant="outline"
        >
          +{chats.length}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="top">
        {chats.map((chat) => (
          <DropdownMenuItem
            className="gap-2"
            key={chat.id}
            onClick={() => dock.focusChat(chat.id)}
          >
            <BotIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{chat.title}</span>
            <button
              aria-label={`Close ${chat.title}`}
              className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
                dock.closeTab(chat.id);
              }}
              type="button"
            >
              <XIcon className="size-3.5" />
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function HistoryButton({ dock }: { dock: Dock }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label="Chat history"
          className="size-8 shrink-0 rounded-full shadow-sm"
          size="icon"
          type="button"
          variant="outline"
        >
          <HistoryIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(360px,calc(100vw-2rem))] gap-0 p-0"
        side="top"
        sideOffset={10}
      >
        <ChatHistoryPanel
          chats={dock.chats}
          onDelete={dock.deleteChat}
          onRename={dock.renameChat}
          onSelect={dock.focusChat}
        />
      </PopoverContent>
    </Popover>
  );
}

interface PanelChromeProps {
  chat: MockChat;
  dock: Dock;
}

function DockConversation({
  messages,
  status,
  streamingMessageId,
  onSubmit,
}: {
  messages: GalleryChatMessage[];
  status: ChatStatus;
  streamingMessageId: string | null;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
}) {
  return (
    <>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6">
          {messages.length === 0 ? (
            <EmptyConversation />
          ) : (
            messages.map((message) => (
              <ChatMessageRow
                isStreaming={streamingMessageId === message.id}
                key={message.id}
                message={message}
              />
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <GalleryChatInput onSubmit={onSubmit} status={status} />
    </>
  );
}

function EmptyConversation() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
      <SparklesIcon className="size-6 text-muted-foreground" />
      <p className="font-medium text-sm">How can I help?</p>
      <p className="max-w-xs text-muted-foreground text-xs">
        Ask about balances, inventory, or documents — I can pull data and draft
        actions.
      </p>
    </div>
  );
}

function PanelMenu({ chat, dock }: PanelChromeProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="size-7 shrink-0"
          size="icon"
          type="button"
          variant="ghost"
        >
          <MoreHorizontalIcon className="size-3.5" />
          <span className="sr-only">More actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onClick={() => dock.copyConversation(chat.id)}>
          <ClipboardCopyIcon />
          Copy conversation
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => dock.clearConversation(chat.id)}
          variant="destructive"
        >
          <Trash2Icon />
          Clear conversation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof MaximizeIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      className="size-7 shrink-0"
      onClick={onClick}
      size="icon"
      type="button"
      variant="ghost"
    >
      <Icon className="size-3.5" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function PanelHeader({
  chat,
  dock,
  actions,
}: PanelChromeProps & { actions: React.ReactNode }) {
  return (
    <header className="flex h-11 items-center gap-2 border-b bg-background px-3">
      <BotIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate font-medium text-sm">{chat.title}</span>
      <div className="ml-auto flex items-center gap-0.5">
        <PanelMenu chat={chat} dock={dock} />
        {actions}
      </div>
    </header>
  );
}

function CompactWindow({ chat, dock }: PanelChromeProps) {
  // Fixed to the bottom-right corner, above the footer bar (h-12). It stays put
  // regardless of which pill is focused or how many pills are open — switching
  // chats swaps the panel's contents in place rather than moving the window.
  return (
    <div
      className="@container fixed right-3 bottom-16 z-50 flex h-[min(560px,70svh)] w-[min(380px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border bg-background shadow-2xl md:right-4"
      data-slot="chat-dock-popup"
    >
      <PanelHeader
        actions={
          <>
            <IconButton
              icon={MaximizeIcon}
              label="Expand chat"
              onClick={dock.expand}
            />
            <IconButton
              icon={MinusIcon}
              label="Minimize chat"
              onClick={dock.minimize}
            />
          </>
        }
        chat={chat}
        dock={dock}
      />
      <DockConversation
        messages={chat.messages}
        onSubmit={(message) => dock.sendMessage(chat.id, message)}
        status={dock.status}
        streamingMessageId={dock.streamingMessageId}
      />
    </div>
  );
}

function BigWindow({ chat, dock }: PanelChromeProps) {
  const {
    panelOpen,
    tabs,
    activeTab,
    activeTabId,
    closePanel,
    openToolTab,
    closeTab,
    setActiveTabId,
  } = useChatSidePanel();

  return (
    <>
      <button
        aria-label="Restore chat to docked view"
        className="fixed inset-0 z-40 cursor-default bg-foreground/10"
        onClick={dock.restore}
        type="button"
      />
      <div
        className="@container fixed inset-3 z-50 flex flex-col overflow-hidden rounded-xl border bg-background shadow-2xl md:inset-6"
        data-slot="chat-dock-expanded"
      >
        <ResizablePanelGroup className="min-h-0 flex-1" direction="horizontal">
          <ResizablePanel
            className="flex min-h-0 flex-col"
            defaultSize={panelOpen ? 62 : 100}
            minSize={40}
          >
            <PanelHeader
              actions={
                <>
                  <IconButton
                    icon={MinimizeIcon}
                    label="Restore to docked view"
                    onClick={dock.restore}
                  />
                  <IconButton
                    icon={XIcon}
                    label="Close chat"
                    onClick={() => dock.closeTab(chat.id)}
                  />
                </>
              }
              chat={chat}
              dock={dock}
            />
            <DockConversation
              messages={chat.messages}
              onSubmit={(message) => dock.sendMessage(chat.id, message)}
              status={dock.status}
              streamingMessageId={dock.streamingMessageId}
            />
          </ResizablePanel>

          {panelOpen ? (
            <>
              <ResizableHandle className="bg-transparent" />
              <ResizablePanel
                className="ml-px flex min-h-0 flex-col overflow-hidden rounded-l-xl border-border border-l bg-accent/5 shadow"
                defaultSize={38}
                maxSize={60}
                minSize={24}
              >
                <ChatSidePanel
                  activeTab={activeTab}
                  activeTabId={activeTabId}
                  onClosePanel={closePanel}
                  onCloseTab={closeTab}
                  onOpenToolTab={openToolTab}
                  onSelectTab={setActiveTabId}
                  tabs={tabs}
                />
              </ResizablePanel>
            </>
          ) : (
            <ClosedPanelRail onOpenFiles={() => openToolTab("files")} />
          )}
        </ResizablePanelGroup>
      </div>
    </>
  );
}

function ClosedPanelRail({ onOpenFiles }: { onOpenFiles: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1 border-l bg-muted/10 px-1.5 py-2">
      <IconButton
        icon={PanelRightIcon}
        label="Open workspace files"
        onClick={onOpenFiles}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Mobile layout
 *
 * On phones the corner popup / resizable file split don't work: the footer
 * crowds, panels collapse, and hover affordances are unreachable. So mobile
 * collapses to a single launcher row (Chats / Ask / History), a full-screen
 * chat Sheet (no popup-vs-expanded distinction), and the file viewer as a
 * Sheet overlay instead of a side-by-side panel.
 * ------------------------------------------------------------------------- */

function MobileDock({ dock }: { dock: Dock }) {
  return (
    <>
      <MobileLauncher dock={dock} />
      {dock.focusedChat ? (
        <MobileChatSheet chat={dock.focusedChat} dock={dock} />
      ) : null}
    </>
  );
}

function MobileLauncher({ dock }: { dock: Dock }) {
  // Most people keep a single main chat going, so surface the most recently
  // opened one right in the row for a one-tap reopen. The chats drawer only
  // appears once there's more than one open chat, and "Ask" shrinks to an icon
  // to make room for the recent-chat pill.
  const openChats = dock.openChats;
  const recent = openChats.at(-1) ?? null;
  const hasOthers = openChats.length > 1;

  return (
    <div className="flex w-full items-center gap-2 px-3 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
      {hasOthers ? <MobileChatsButton dock={dock} /> : null}
      {recent ? (
        <>
          <button
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border bg-background px-4 text-left shadow-sm transition-colors hover:bg-accent/40"
            onClick={() => dock.focusChat(recent.id)}
            type="button"
          >
            <BotIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate font-medium text-sm">
              {recent.title}
            </span>
          </button>
          <Button
            aria-label="Ask the assistant"
            className="size-10 shrink-0 rounded-full shadow-sm"
            onClick={dock.newChat}
            size="icon"
            type="button"
          >
            <SparklesIcon className="size-5" />
          </Button>
        </>
      ) : (
        <Button
          className="h-10 flex-1 gap-1.5 rounded-full shadow-sm"
          onClick={dock.newChat}
          type="button"
        >
          <SparklesIcon className="size-4" />
          <span className="font-medium text-sm">Ask the assistant</span>
        </Button>
      )}
      <MobileHistoryButton dock={dock} />
    </div>
  );
}

function MobileChatsButton({ dock }: { dock: Dock }) {
  const [open, setOpen] = useState(false);
  const count = dock.openChats.length;
  // Newest first — the most recently opened chats sit at the top of the list.
  const chats = [...dock.openChats].reverse();

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <DrawerTrigger asChild>
        <Button
          aria-label={`Open chats (${count})`}
          className="relative size-10 shrink-0 rounded-full shadow-sm"
          size="icon"
          type="button"
          variant="outline"
        >
          <MessagesSquareIcon className="size-5" />
          {count > 0 ? (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-medium text-[11px] text-primary-foreground">
              {count}
            </span>
          ) : null}
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Chats</DrawerTitle>
        </DrawerHeader>
        <div className="max-h-[60svh] min-h-0 overflow-y-auto px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {chats.length === 0 ? (
            <p className="px-3 py-8 text-center text-muted-foreground text-sm">
              No open chats. Tap “Ask the assistant” to start one.
            </p>
          ) : (
            chats.map((chat) => (
              <MobileChatRow
                chat={chat}
                dock={dock}
                key={chat.id}
                onOpen={() => {
                  dock.focusChat(chat.id);
                  setOpen(false);
                }}
              />
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function MobileChatRow({
  chat,
  dock,
  onOpen,
}: {
  chat: MockChat;
  dock: Dock;
  onOpen: () => void;
}) {
  const isFocused = dock.focusedId === chat.id;
  return (
    <div className="flex items-center gap-1 rounded-lg pr-1">
      <button
        className={cn(
          "flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 text-left",
          isFocused ? "bg-accent text-accent-foreground" : "hover:bg-muted"
        )}
        onClick={onOpen}
        type="button"
      >
        <BotIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm">{chat.title}</span>
        <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
          {chat.ageLabel}
        </span>
      </button>
      <button
        aria-label={`Close ${chat.title}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={() => dock.closeTab(chat.id)}
        type="button"
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}

function MobileHistoryButton({ dock }: { dock: Dock }) {
  const [open, setOpen] = useState(false);
  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <DrawerTrigger asChild>
        <Button
          aria-label="Chat history"
          className="size-10 shrink-0 rounded-full shadow-sm"
          size="icon"
          type="button"
          variant="outline"
        >
          <HistoryIcon className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="sr-only">
          <DrawerTitle>Chat history</DrawerTitle>
        </DrawerHeader>
        <div className="min-h-0 overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          <ChatHistoryPanel
            chats={dock.chats}
            onDelete={dock.deleteChat}
            onRename={dock.renameChat}
            onSelect={(id) => {
              dock.focusChat(id);
              setOpen(false);
            }}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function MobileChatSheet({ chat, dock }: PanelChromeProps) {
  const [filesOpen, setFilesOpen] = useState(false);

  return (
    <>
      <Sheet
        onOpenChange={(next) => {
          if (!next) {
            dock.minimize();
          }
        }}
        open
      >
        <SheetContent
          className="inset-0 flex h-dvh max-h-dvh w-full flex-col gap-0 rounded-none border-0 p-0 sm:max-w-none"
          onOpenAutoFocus={(event) => event.preventDefault()}
          showCloseButton={false}
          side="bottom"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>{chat.title}</SheetTitle>
          </SheetHeader>
          <div className="@container flex min-h-0 flex-1 flex-col">
            <MobileChatHeader
              chat={chat}
              dock={dock}
              onOpenFiles={() => setFilesOpen(true)}
            />
            <DockConversation
              messages={chat.messages}
              onSubmit={(message) => dock.sendMessage(chat.id, message)}
              status={dock.status}
              streamingMessageId={dock.streamingMessageId}
            />
          </div>
        </SheetContent>
      </Sheet>
      <MobileFilesSheet onOpenChange={setFilesOpen} open={filesOpen} />
    </>
  );
}

function MobileChatHeader({
  chat,
  dock,
  onOpenFiles,
}: PanelChromeProps & { onOpenFiles: () => void }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b bg-background px-1.5 pt-[env(safe-area-inset-top)]">
      <Button
        aria-label="Minimize chat"
        className="size-11 shrink-0"
        onClick={dock.minimize}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ChevronDownIcon className="size-5" />
      </Button>
      <span className="min-w-0 flex-1 truncate font-medium text-sm">
        {chat.title}
      </span>
      <Button
        aria-label="Open workspace files"
        className="size-11 shrink-0"
        onClick={onOpenFiles}
        size="icon"
        type="button"
        variant="ghost"
      >
        <FolderTreeIcon className="size-5" />
      </Button>
      <PanelMenu chat={chat} dock={dock} />
    </header>
  );
}

function MobileFilesSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    tabs,
    activeTab,
    activeTabId,
    openToolTab,
    closeTab,
    setActiveTabId,
  } = useChatSidePanel("files");

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="inset-x-0 bottom-0 flex w-full flex-col gap-0 rounded-t-xl p-0 data-[side=bottom]:h-[90dvh] sm:max-w-none"
        showCloseButton={false}
        side="bottom"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Workspace files</SheetTitle>
        </SheetHeader>
        <ChatSidePanel
          activeTab={activeTab}
          activeTabId={activeTabId}
          onClosePanel={() => onOpenChange(false)}
          onCloseTab={closeTab}
          onOpenToolTab={openToolTab}
          onSelectTab={setActiveTabId}
          tabs={tabs}
        />
      </SheetContent>
    </Sheet>
  );
}
