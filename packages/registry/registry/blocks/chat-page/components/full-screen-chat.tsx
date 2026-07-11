"use client";

import {
  ShellHeader,
  ShellHeaderSidebarTrigger,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/shadcn/empty";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/shadcn/message-scroller";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/shadcn/resizable";
import { type ChatStatus, isTextUIPart } from "ai";
import {
  BotIcon,
  ClipboardCopyIcon,
  MessageCircleDashedIcon,
  MoreHorizontalIcon,
  PanelRightIcon,
  Trash2Icon,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useChatSidePanel } from "../hooks/use-chat-side-panel";
import {
  createMockAssistantReply,
  type GalleryChatMessage,
  MOCK_CHAT_MESSAGES,
} from "../lib/mock-chat-messages";
import { GalleryChatInput, type GalleryPromptMessage } from "./chat-input";
import { ChatMessageRow } from "./chat-message-parts";
import { ChatSidePanel } from "./chat-side-panel";

function EmptyConversation() {
  return (
    <Empty className="h-full border-0">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <MessageCircleDashedIcon />
        </EmptyMedia>
        <EmptyTitle>How can I help?</EmptyTitle>
        <EmptyDescription>
          Ask about balances, inventory, or documents — I can pull data and
          draft actions.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function FullScreenChat() {
  const [messages, setMessages] = useState(MOCK_CHAT_MESSAGES);
  const [status, setStatus] = useState<ChatStatus>("ready");
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const {
    panelOpen,
    tabs,
    activeTab,
    activeTabId,
    togglePanel,
    closePanel,
    openToolTab,
    closeTab,
    setActiveTabId,
  } = useChatSidePanel();
  const handleSubmit = useCallback(
    async (message: GalleryPromptMessage) => {
      const text = message.text.trim();
      const hasAttachments = Boolean(message.files?.length);
      if (!(text || hasAttachments)) {
        return;
      }
      const userMessage: GalleryChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        parts: [
          {
            type: "text",
            text: text || "Sent with attachments",
          },
        ],
      };
      setMessages((current) => [...current, userMessage]);
      setStatus("submitted");
      await new Promise((resolve) => setTimeout(resolve, 400));
      const assistantMessage = createMockAssistantReply(messages.length);
      setStreamingMessageId(assistantMessage.id);
      setMessages((current) => [...current, assistantMessage]);
      setStatus("streaming");
      await new Promise((resolve) => setTimeout(resolve, 900));
      setStreamingMessageId(null);
      setStatus("ready");
    },
    [messages.length]
  );
  const handleCopyConversation = useCallback(() => {
    const text = messages
      .map((message) => {
        const body = message.parts
          .filter(isTextUIPart)
          .map((part) => part.text)
          .join("\n");
        return `${message.role}: ${body}`;
      })
      .join("\n\n");
    navigator.clipboard.writeText(text).catch(() => undefined);
  }, [messages]);
  const handleDeleteConversation = useCallback(() => {
    setMessages([]);
    setStreamingMessageId(null);
    setStatus("ready");
  }, []);
  return (
    <div
      className="@container flex h-full min-h-0 flex-col bg-background"
      data-slot="full-screen-chat"
    >
      <ResizablePanelGroup
        className="min-h-0 flex-1"
        data-slot="full-screen-chat-layout"
        orientation="horizontal"
      >
        <ResizablePanel
          className="flex min-h-0 flex-col"
          defaultSize={panelOpen ? "68%" : "100%"}
          minSize="45%"
        >
          <ShellHeader
            className="h-10 px-3"
            data-slot="full-screen-chat-header"
          >
            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <BotIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium text-sm">ERP Assistant</span>
              <span className="max-w-[240px] truncate font-normal text-muted-foreground text-sm">
                · Open balances
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="size-7 shrink-0"
                      size="icon"
                      type="button"
                      variant="ghost"
                    />
                  }
                >
                  <MoreHorizontalIcon className="size-3.5" />
                  <span className="sr-only">More actions</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleCopyConversation}>
                    <ClipboardCopyIcon />
                    Copy conversation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDeleteConversation}
                    variant="destructive"
                  >
                    <Trash2Icon />
                    Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {panelOpen ? null : (
              <Button
                className="ml-auto size-7 shrink-0"
                onClick={togglePanel}
                size="icon"
                type="button"
                variant="ghost"
              >
                <PanelRightIcon className="size-3.5" />
                <span className="sr-only">Open side panel</span>
              </Button>
            )}
          </ShellHeader>

          <MessageScrollerProvider autoScroll>
            <MessageScroller className="min-h-0 flex-1">
              <MessageScrollerViewport>
                <MessageScrollerContent className="mx-auto w-full max-w-3xl gap-6 p-4">
                  {messages.length === 0 ? (
                    <EmptyConversation />
                  ) : (
                    messages.map((message) => (
                      <MessageScrollerItem
                        key={message.id}
                        messageId={message.id}
                        scrollAnchor={message.role === "user"}
                      >
                        <ChatMessageRow
                          isStreaming={streamingMessageId === message.id}
                          message={message}
                        />
                      </MessageScrollerItem>
                    ))
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>

          <GalleryChatInput onSubmit={handleSubmit} status={status} />
        </ResizablePanel>

        {panelOpen ? (
          <>
            <ResizableHandle className="bg-transparent" />
            <ResizablePanel
              className="ml-px flex min-h-0 flex-col overflow-hidden rounded-l-xl border-border border-l bg-accent/5 shadow"
              defaultSize="32%"
              maxSize="55%"
              minSize="22%"
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
        ) : null}
      </ResizablePanelGroup>
    </div>
  );
}
