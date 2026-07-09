"use client";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation";
import type { PromptInputMessage } from "@workspace/ui/components/ai-elements/prompt-input";
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@workspace/ui/components/shadcn/resizable";
import { type ChatStatus, isTextUIPart } from "ai";
import {
  BotIcon,
  ClipboardCopyIcon,
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
import { GalleryChatInput } from "./chat-input";
import { ChatMessageRow } from "./chat-message-parts";
import { ChatSidePanel } from "./chat-side-panel";
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
    async (message: PromptInputMessage) => {
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
        direction="horizontal"
      >
        <ResizablePanel
          className="flex min-h-0 flex-col"
          defaultSize={panelOpen ? 68 : 100}
          minSize={45}
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

          <Conversation className="min-h-0 flex-1">
            <ConversationContent className="mx-auto w-full max-w-3xl gap-6">
              {messages.map((message) => (
                <ChatMessageRow
                  isStreaming={streamingMessageId === message.id}
                  key={message.id}
                  message={message}
                />
              ))}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          <GalleryChatInput onSubmit={handleSubmit} status={status} />
        </ResizablePanel>

        {panelOpen ? (
          <>
            <ResizableHandle className="bg-transparent" />
            <ResizablePanel
              className="ml-px flex min-h-0 flex-col overflow-hidden rounded-l-xl border-border border-l bg-accent/5 shadow"
              defaultSize={32}
              maxSize={55}
              minSize={22}
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
