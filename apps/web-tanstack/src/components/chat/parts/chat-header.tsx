"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { SidebarTrigger } from "@workspace/ui/components/shadcn/sidebar";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/shadcn/tooltip";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import {
  BotIcon,
  BrainIcon,
  ClipboardCopyIcon,
  Maximize2Icon,
  Minimize2Icon,
  MinusIcon,
  MoreHorizontalIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useState } from "react";
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
        ?.title ?? "Chat"
  );
  const canCopy = messages.length > 0;

  const handleCopyMessages = useCallback(async () => {
    if (messages.length === 0) {
      toast.info("No messages to copy");
      return;
    }
    await navigator.clipboard.writeText(formatMessagesAsJson(messages));
    toast.success("Copied to clipboard");
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

  const handleMinimize = useCallback(() => {
    useChatTabsStore.getState().closeBody();
  }, []);

  const handleClose = useCallback(() => {
    useChatTabsStore.getState().closeTab(organizationId, tabKey);
  }, [tabKey, organizationId]);

  return (
    <div className="flex h-10 shrink-0 items-center justify-between border-b px-3">
      <div className="flex items-center gap-2 overflow-hidden">
        {bodyState === "fullscreen" && (
          <SidebarTrigger className="-ml-0.5 shrink-0 md:hidden" />
        )}
        <BotIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="shrink-0 font-medium text-sm">ERP Assistant</span>
        {title !== "Chat" && title !== "New chat" && (
          <span className="max-w-[240px] truncate font-normal text-muted-foreground text-sm">
            · {title}
          </span>
        )}
      </div>
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button className="size-7" size="icon" variant="ghost">
                    <MoreHorizontalIcon className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">More</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setMemoryOpen(true)}>
                <BrainIcon className="size-4" />
                Organization memory
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={!canCopy}
                onSelect={handleCopyMessages}
              >
                <ClipboardCopyIcon className="size-4" />
                Copy conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <MemoryDialog onOpenChange={setMemoryOpen} open={memoryOpen} />
          {!isMobile && (
            <SizeToggleButton
              bodyState={bodyState}
              onCollapse={handleCollapse}
              onExpand={handleExpand}
            />
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-7"
                onClick={handleMinimize}
                size="icon"
                variant="ghost"
              >
                <MinusIcon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isMobile ? "Minimize" : "Minimize to dock"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="size-7"
                onClick={handleClose}
                size="icon"
                variant="ghost"
              >
                <XIcon className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Close chat</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
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
      <TooltipTrigger asChild>
        <Button
          className="size-7"
          onClick={isFullscreen ? onCollapse : onExpand}
          size="icon"
          variant="ghost"
        >
          {isFullscreen ? (
            <Minimize2Icon className="size-3.5" />
          ) : (
            <Maximize2Icon className="size-3.5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {isFullscreen ? "Restore size" : "Expand"}
      </TooltipContent>
    </Tooltip>
  );
}
