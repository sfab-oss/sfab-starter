"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { toast } from "@workspace/ui/components/shadcn/sonner";
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
  BrainIcon,
  ChevronDownIcon,
  ClipboardCopyIcon,
  FolderTreeIcon,
  Maximize2Icon,
  Minimize2Icon,
  MinusIcon,
  MoreHorizontalIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
  defaultChatTitle,
  isGenericChatTitle,
} from "@/components/chat/chat-titles";
import { useChatOrgConnection } from "@/components/chat/connection/chat-org-connection";
import {
  type OrgChatMessage,
  useChatTabsStore,
  useFocusedTabId,
} from "@/components/chat/dock/chat-tabs-store";
import {
  type DockBodyState,
  useDockBodyState,
} from "@/components/chat/dock/use-dock-state";
import { MemoryDialog } from "@/components/chat/memory/memory-dialog-button";
import { useChatWindow } from "@/components/chat/window/chat-window";
import { m } from "@/paraglide/messages.js";

function formatMessagesAsJson(messages: OrgChatMessage[]): string {
  return JSON.stringify(messages, null, 2);
}
export function ChatHeader() {
  const { messages, tabKey } = useChatWindow();
  const { organizationId } = useChatOrgConnection();
  const bodyState = useDockBodyState(organizationId);
  const isMobile = useIsMobile();
  const focusedTabId = useFocusedTabId(organizationId);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const title = useChatTabsStore(
    (s) =>
      s.byOrganization[organizationId]?.tabs.find((t) => t.tabKey === tabKey)
        ?.title ?? defaultChatTitle()
  );
  const canCopy = messages.length > 0;
  const handleCopyMessages = useCallback(async () => {
    if (messages.length === 0) {
      toast.info(m.chat_no_messages_copy());
      return;
    }
    await navigator.clipboard.writeText(formatMessagesAsJson(messages));
    toast.success(m.chat_copied());
  }, [messages]);
  const handleExpand = useCallback(() => {
    if (focusedTabId) {
      useChatTabsStore
        .getState()
        .setTabSize(organizationId, focusedTabId, "fullscreen");
    }
  }, [organizationId, focusedTabId]);
  const handleCollapse = useCallback(() => {
    if (!isMobile && focusedTabId) {
      useChatTabsStore
        .getState()
        .setTabSize(organizationId, focusedTabId, "popup");
    }
  }, [isMobile, organizationId, focusedTabId]);
  const isFilesPanelOpen = useChatTabsStore((s) => s.isFilesPanelOpen);
  const handleToggleFiles = useCallback(() => {
    const store = useChatTabsStore.getState();
    if (store.isFilesPanelOpen) {
      store.closeFilesPanel();
    } else {
      store.openFilesPanel();
    }
  }, []);
  const handleMinimize = useCallback(() => {
    useChatTabsStore.getState().closeBody();
  }, []);
  const handleClose = useCallback(() => {
    useChatTabsStore.getState().closeTab(organizationId, tabKey);
  }, [tabKey, organizationId]);
  if (isMobile) {
    return (
      <MobileChatHeader
        canCopy={canCopy}
        isFilesPanelOpen={isFilesPanelOpen}
        memoryOpen={memoryOpen}
        onClose={handleClose}
        onCopyMessages={handleCopyMessages}
        onMinimize={handleMinimize}
        onToggleFiles={handleToggleFiles}
        setMemoryOpen={setMemoryOpen}
        title={title}
      />
    );
  }
  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
      <div className="flex items-center gap-2 overflow-hidden">
        <BotIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="shrink-0 font-medium text-sm">
          {m.chat_assistant()}
        </span>
        {!isGenericChatTitle(title) && (
          <span className="max-w-[240px] truncate font-normal text-muted-foreground text-sm">
            · {title}
          </span>
        )}
      </div>
      <TooltipProvider delay={300}>
        <div className="flex items-center gap-0.5">
          <ChatMoreMenu
            canCopy={canCopy}
            onCopyMessages={handleCopyMessages}
            onOpenMemory={() => setMemoryOpen(true)}
          />
          <MemoryDialog onOpenChange={setMemoryOpen} open={memoryOpen} />
          {bodyState === "fullscreen" && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    aria-label={
                      isFilesPanelOpen
                        ? m.chat_hide_files()
                        : m.chat_show_files()
                    }
                    aria-pressed={isFilesPanelOpen}
                    className={cn(
                      "size-7",
                      isFilesPanelOpen && "text-foreground"
                    )}
                    onClick={handleToggleFiles}
                    size="icon"
                    variant="ghost"
                  />
                }
              >
                <FolderTreeIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isFilesPanelOpen ? m.chat_hide_files() : m.chat_files()}
              </TooltipContent>
            </Tooltip>
          )}
          <SizeToggleButton
            bodyState={bodyState}
            onCollapse={handleCollapse}
            onExpand={handleExpand}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className="size-7"
                  onClick={handleMinimize}
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <MinusIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {m.chat_minimize_dock()}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className="size-7"
                  onClick={handleClose}
                  size="icon"
                  variant="ghost"
                />
              }
            >
              <XIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent side="bottom">{m.chat_close()}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
function MobileChatHeader({
  canCopy,
  isFilesPanelOpen,
  memoryOpen,
  onClose,
  onCopyMessages,
  onMinimize,
  onToggleFiles,
  setMemoryOpen,
  title,
}: {
  canCopy: boolean;
  isFilesPanelOpen: boolean;
  memoryOpen: boolean;
  onClose: () => void;
  onCopyMessages: () => void;
  onMinimize: () => void;
  onToggleFiles: () => void;
  setMemoryOpen: (open: boolean) => void;
  title: string;
}) {
  const displayTitle = isGenericChatTitle(title) ? m.chat_assistant() : title;
  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b bg-background px-1.5 pt-[env(safe-area-inset-top)]">
      <Button
        aria-label={m.chat_minimize_mobile()}
        className="size-11 shrink-0"
        onClick={onMinimize}
        size="icon"
        type="button"
        variant="ghost"
      >
        <ChevronDownIcon className="size-5" />
      </Button>
      <span className="min-w-0 flex-1 truncate font-medium text-sm">
        {displayTitle}
      </span>
      <Button
        aria-label={
          isFilesPanelOpen ? m.chat_hide_files() : m.chat_show_files()
        }
        aria-pressed={isFilesPanelOpen}
        className={cn(
          "size-11 shrink-0",
          isFilesPanelOpen && "text-foreground"
        )}
        onClick={onToggleFiles}
        size="icon"
        type="button"
        variant="ghost"
      >
        <FolderTreeIcon className="size-5" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={m.chat_more()}
              className="size-11 shrink-0"
              size="icon"
              type="button"
              variant="ghost"
            />
          }
        >
          <MoreHorizontalIcon className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setMemoryOpen(true)}>
            <BrainIcon className="size-4" />
            {m.chat_org_memory()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!canCopy} onSelect={onCopyMessages}>
            <ClipboardCopyIcon className="size-4" />
            {m.chat_copy_conversation()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onClose}>
            <XIcon className="size-4" />
            {m.chat_close()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <MemoryDialog onOpenChange={setMemoryOpen} open={memoryOpen} />
    </header>
  );
}
function ChatMoreMenu({
  canCopy,
  onCopyMessages,
  onOpenMemory,
}: {
  canCopy: boolean;
  onCopyMessages: () => void;
  onOpenMemory: () => void;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={<Button className="size-7" size="icon" variant="ghost" />}
            />
          }
        >
          <MoreHorizontalIcon className="size-3.5" />
        </TooltipTrigger>
        <TooltipContent side="bottom">{m.chat_more()}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onOpenMemory}>
          <BrainIcon className="size-4" />
          {m.chat_org_memory()}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!canCopy} onSelect={onCopyMessages}>
          <ClipboardCopyIcon className="size-4" />
          {m.chat_copy_conversation()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function SizeToggleButton({
  bodyState,
  onCollapse,
  onExpand,
}: {
  bodyState: DockBodyState;
  onCollapse: () => void;
  onExpand: () => void;
}) {
  const isFullscreen = bodyState === "fullscreen";
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            className="size-7"
            onClick={isFullscreen ? onCollapse : onExpand}
            size="icon"
            variant="ghost"
          />
        }
      >
        {isFullscreen ? (
          <Minimize2Icon className="size-3.5" />
        ) : (
          <Maximize2Icon className="size-3.5" />
        )}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isFullscreen ? m.chat_restore_size() : m.chat_expand()}
      </TooltipContent>
    </Tooltip>
  );
}
