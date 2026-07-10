/** biome-ignore-all lint/suspicious/noArrayIndexKey: Streaming message parts do not have stable IDs */

import { ConversationEmptyState } from "@workspace/ui/components/ai-elements/conversation";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@workspace/ui/components/shadcn/attachment";
import { Bubble, BubbleContent } from "@workspace/ui/components/shadcn/bubble";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Marker,
  MarkerContent,
  MarkerIcon,
} from "@workspace/ui/components/shadcn/marker";
import {
  Message,
  MessageContent,
  MessageFooter,
} from "@workspace/ui/components/shadcn/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/shadcn/message-scroller";
import type { FileUIPart } from "ai";
import {
  AlertCircleIcon,
  FileIcon,
  HistoryIcon,
  PaperclipIcon,
  RefreshCcwIcon,
} from "lucide-react";
import { memo } from "react";
import { isCompactionMessage } from "@/components/chat/context-usage";
import type {
  ChatHelpers,
  OrgChatMessage,
  OutgoingMessage,
} from "@/components/chat/dock/chat-tabs-store";
import { MessageContextBadge } from "@/components/chat/message-context-badge";
import { ChatMessageActions } from "@/components/chat/parts/message-actions";
import { ChatErrorMessage } from "./chat-error-message";
import { MessagePart } from "./message-part";

const PENDING_MESSAGE_ID = "__pending__";

interface ChatMessagesProps {
  helpers: ChatHelpers | null;
  isHydrating?: boolean;
  onRetry: () => void;
  pending: OutgoingMessage | null;
  sendError: string | null;
}

function AttachmentMediaIcon({ part }: { part: FileUIPart }) {
  if (part.mediaType?.includes("pdf")) {
    return <FileIcon />;
  }
  return <PaperclipIcon />;
}

function FileAttachment({ part }: { part: FileUIPart }) {
  const isImage = Boolean(part.mediaType?.startsWith("image/") && part.url);
  const name = part.filename || (isImage ? "Image" : "Attachment");
  const mediaLabel = part.mediaType?.split("/").pop()?.toUpperCase();

  return (
    <Attachment
      orientation={isImage ? "vertical" : "horizontal"}
      size="sm"
      state="done"
    >
      <AttachmentMedia variant={isImage ? "image" : "icon"}>
        {isImage ? (
          <img alt={name} height={96} src={part.url} width={96} />
        ) : (
          <AttachmentMediaIcon part={part} />
        )}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>{name}</AttachmentTitle>
        {mediaLabel ? (
          <AttachmentDescription>{mediaLabel}</AttachmentDescription>
        ) : null}
      </AttachmentContent>
    </Attachment>
  );
}

function CompactionMarker({ message }: { message: OrgChatMessage }) {
  const summary = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  return (
    <div className="flex flex-col gap-2 py-2">
      <Marker variant="separator">
        <MarkerIcon>
          <HistoryIcon />
        </MarkerIcon>
        <MarkerContent>Earlier conversation summarized</MarkerContent>
      </Marker>
      {summary ? (
        <p className="line-clamp-3 px-1 text-center text-muted-foreground text-xs">
          {summary}
        </p>
      ) : null}
    </div>
  );
}

function ChatMessage({
  message,
  isLoading,
}: {
  message: OrgChatMessage;
  isLoading: boolean;
}) {
  if (isCompactionMessage(message)) {
    return <CompactionMarker message={message} />;
  }

  const fileParts = message.parts.filter(
    (part): part is FileUIPart & { type: "file" } => part.type === "file"
  );
  const otherParts = message.parts.filter((part) => part.type !== "file");
  const pageContext =
    message.role === "user" ? message.metadata?.pageContext : undefined;
  const align = message.role === "user" ? "end" : "start";

  return (
    <Message align={align}>
      <MessageContent>
        {pageContext ? <MessageContextBadge pageContext={pageContext} /> : null}
        {fileParts.length > 0 ? (
          <AttachmentGroup className="mb-1 max-w-full">
            {fileParts.map((part, partIndex) => (
              <FileAttachment
                key={`${message.id}-file-${partIndex}`}
                part={part}
              />
            ))}
          </AttachmentGroup>
        ) : null}
        {otherParts.map((part, partIndex) => (
          <MessagePart
            isLastPart={partIndex === otherParts.length - 1}
            isLoading={isLoading}
            key={`${message.id}-part-${partIndex}`}
            messageId={message.id}
            part={part}
            partIndex={partIndex}
            role={message.role}
          />
        ))}
        {message.id === PENDING_MESSAGE_ID ? null : (
          <MessageFooter>
            <ChatMessageActions isLoading={isLoading} messageId={message.id} />
          </MessageFooter>
        )}
      </MessageContent>
    </Message>
  );
}

function RecoveringBanner() {
  return (
    <Marker role="status">
      <MarkerIcon>
        <RefreshCcwIcon className="animate-spin" />
      </MarkerIcon>
      <MarkerContent>Recovering the previous response…</MarkerContent>
    </Marker>
  );
}

function PendingSendErrorPill({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <output className="mx-auto flex w-full justify-end">
      <Bubble align="end" variant="destructive">
        <BubbleContent>
          <div className="flex items-start gap-2">
            <AlertCircleIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0"
            />
            <div className="flex flex-1 flex-col gap-1.5">
              <span className="font-medium">Couldn't send your message.</span>
              <span className="text-xs opacity-80">{error}</span>
              <div>
                <Button
                  aria-label="Retry sending message"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={onRetry}
                  size="sm"
                  variant="outline"
                >
                  <RefreshCcwIcon className="size-3" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </BubbleContent>
      </Bubble>
    </output>
  );
}

export function MessagesAreaSkeleton() {
  return (
    <div className="h-full flex-1 overflow-y-hidden">
      <div className="container mx-auto flex h-full w-full flex-col gap-2 px-4 pb-6 sm:max-w-2xl md:max-w-3xl">
        <div className="mt-6 ml-auto h-10 w-2/3 animate-pulse rounded-2xl bg-muted" />
        <div className="mt-4 mr-auto h-16 w-3/4 animate-pulse rounded-2xl bg-muted" />
        <div className="mt-2 ml-auto h-8 w-1/2 animate-pulse rounded-2xl bg-muted" />
        <div className="mt-4 mr-auto h-24 w-4/5 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

function pendingMessageView(pending: OutgoingMessage): OrgChatMessage {
  return {
    id: PENDING_MESSAGE_ID,
    parts: pending.parts,
    role: pending.role,
  } as OrgChatMessage;
}

function TranscriptScroller({ children }: { children: React.ReactNode }) {
  return (
    <MessageScrollerProvider
      autoScroll
      defaultScrollPosition="last-anchor"
      scrollPreviousItemPeek={64}
    >
      <MessageScroller className="h-full flex-1">
        <MessageScrollerViewport>
          <MessageScrollerContent className="container mx-auto w-full gap-2 px-4 py-4 pb-6 sm:max-w-2xl md:max-w-3xl">
            {children}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

function ChatMessagesInternal({
  helpers,
  isHydrating,
  onRetry,
  pending,
  sendError,
}: ChatMessagesProps) {
  if (!helpers) {
    if (!pending) {
      return <ConversationEmptyState />;
    }
    const pendingMessage = pendingMessageView(pending);
    return (
      <TranscriptScroller>
        <MessageScrollerItem messageId={pendingMessage.id} scrollAnchor>
          <ChatMessage isLoading={false} message={pendingMessage} />
        </MessageScrollerItem>
        {sendError === null ? null : (
          <MessageScrollerItem messageId="pending-send-error">
            <PendingSendErrorPill error={sendError} onRetry={onRetry} />
          </MessageScrollerItem>
        )}
      </TranscriptScroller>
    );
  }

  const { status, messages, error, isStreaming, isRecovering } = helpers;
  const isLoading = isStreaming || isRecovering || status === "submitted";
  const hasTurnError = status === "error" || Boolean(error);

  if (messages.length === 0 && !pending && !hasTurnError) {
    return isHydrating ? <MessagesAreaSkeleton /> : <ConversationEmptyState />;
  }

  const hasUserInMessages = messages.some((m) => m.role === "user");
  const pendingBubble = pending ? pendingMessageView(pending) : null;
  const rendered: OrgChatMessage[] =
    !hasUserInMessages && pendingBubble
      ? [pendingBubble, ...messages]
      : messages;

  const showErrorPill = sendError !== null && pending !== null;

  return (
    <TranscriptScroller>
      {isRecovering ? (
        <MessageScrollerItem messageId="recovering">
          <RecoveringBanner />
        </MessageScrollerItem>
      ) : null}
      {rendered.map((message) => (
        <MessageScrollerItem
          key={message.id}
          messageId={message.id}
          scrollAnchor={message.role === "user"}
        >
          <ChatMessage isLoading={isLoading} message={message} />
        </MessageScrollerItem>
      ))}
      {hasTurnError ? (
        <MessageScrollerItem messageId="turn-error">
          <ChatErrorMessage error={error} />
        </MessageScrollerItem>
      ) : null}
      {showErrorPill ? (
        <MessageScrollerItem messageId="pending-send-error">
          <PendingSendErrorPill error={sendError} onRetry={onRetry} />
        </MessageScrollerItem>
      ) : null}
    </TranscriptScroller>
  );
}

export const ChatMessages = memo(ChatMessagesInternal);
