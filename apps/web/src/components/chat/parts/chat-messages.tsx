/** biome-ignore-all lint/suspicious/noArrayIndexKey: Streaming message parts do not have stable IDs */

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation";
import {
  Message,
  MessageAttachment,
  MessageAttachments,
  MessageContent,
} from "@workspace/ui/components/ai-elements/message";
import { Button } from "@workspace/ui/components/shadcn/button";
import { cn } from "@workspace/ui/lib/utils";
import { AlertCircleIcon, HistoryIcon, RefreshCcwIcon } from "lucide-react";
import { memo } from "react";
import { isCompactionMessage } from "@/components/chat/context-usage";
import type {
  ChatHelpers,
  OrgChatMessage,
  OutgoingMessage,
} from "@/components/chat/dock/chat-tabs-store";
import { MessageContextBadge } from "@/components/chat/message-context-badge";
import { ChatErrorMessage } from "./chat-error-message";
import { ChatMessageActions } from "./message-actions";
import { MessagePart } from "./message-part";

const PENDING_MESSAGE_ID = "__pending__";

interface ChatMessagesProps {
  helpers: ChatHelpers | null;
  isHydrating?: boolean;
  onRetry: () => void;
  pending: OutgoingMessage | null;
  sendError: string | null;
}

function CompactionMarker({ message }: { message: OrgChatMessage }) {
  const summary = message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();

  return (
    <div className="relative py-3" key={message.id}>
      <div className="absolute inset-x-0 top-1/2 border-border border-t" />
      <div className="relative mx-auto flex max-w-md flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-full border bg-background px-3 py-1 text-muted-foreground text-xs">
          <HistoryIcon aria-hidden="true" className="size-3" />
          Earlier conversation summarized
        </div>
        {summary ? (
          <p className="line-clamp-3 px-4 text-center text-muted-foreground text-xs">
            {summary}
          </p>
        ) : null}
      </div>
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

  const fileParts = message.parts.filter((part) => part.type === "file");
  const otherParts = message.parts.filter((part) => part.type !== "file");
  const pageContext =
    message.role === "user" ? message.metadata?.pageContext : undefined;

  return (
    <Message
      className={cn(
        "flex w-full flex-col gap-2",
        message.role === "user" && "items-end"
      )}
      from={message.role}
      key={message.id}
    >
      {pageContext ? (
        <div className="flex w-full justify-end pr-1">
          <MessageContextBadge pageContext={pageContext} />
        </div>
      ) : null}
      {fileParts.length > 0 && (
        <MessageAttachments className="mb-2">
          {fileParts.map((part, partIndex) => (
            <MessageAttachment
              data={part}
              key={`${message.id}-file-${partIndex}`}
            />
          ))}
        </MessageAttachments>
      )}
      <MessageContent className="w-full">
        {otherParts.map((part, partIndex) => (
          <MessagePart
            isLastPart={partIndex === otherParts.length - 1}
            isLoading={isLoading}
            key={`${message.id}-part-${partIndex}`}
            messageId={message.id}
            part={part}
            partIndex={partIndex}
          />
        ))}
      </MessageContent>

      {message.id !== PENDING_MESSAGE_ID && (
        <ChatMessageActions isLoading={isLoading} messageId={message.id} />
      )}
    </Message>
  );
}

function RecoveringBanner() {
  return (
    <output className="mx-auto flex w-full justify-center">
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-muted-foreground text-xs">
        <RefreshCcwIcon
          aria-hidden="true"
          className="size-3.5 shrink-0 animate-spin"
        />
        <span>Recovering the previous response…</span>
      </div>
    </output>
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
      <div className="flex max-w-md items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-sm">
        <AlertCircleIcon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
        />
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="font-medium">Couldn't send your message.</span>
          <span className="text-destructive/80 text-xs">{error}</span>
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
    return (
      <Conversation className="h-full flex-1 overflow-y-hidden">
        <ConversationContent className="container mx-auto w-full gap-2 pb-6 sm:max-w-2xl md:max-w-3xl">
          <ChatMessage
            isLoading={false}
            message={pendingMessageView(pending)}
          />
          {sendError !== null && (
            <PendingSendErrorPill error={sendError} onRetry={onRetry} />
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
    );
  }

  const { status, messages, error, isStreaming, isRecovering } = helpers;
  // `isStreaming` is the hook's universal indicator — true for a client stream
  // (`status === "streaming"`) OR a server-initiated one (auto-continuation,
  // another tab). `isRecovering` covers a durable turn resuming after a
  // deploy/eviction. Together they are the full "busy" window.
  const isLoading = isStreaming || isRecovering || status === "submitted";
  const hasTurnError = status === "error" || Boolean(error);

  if (messages.length === 0 && !pending && !hasTurnError) {
    // While the socket is still connecting, the on-connect transcript broadcast
    // hasn't arrived — show the skeleton so a reload of a chat-with-history
    // doesn't flash the empty state before its messages load.
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
    <Conversation className="h-full flex-1 overflow-y-hidden">
      <ConversationContent className="container mx-auto w-full gap-2 pb-6 sm:max-w-2xl md:max-w-3xl">
        {isRecovering && <RecoveringBanner />}
        {rendered.map((message) => (
          <ChatMessage
            isLoading={isLoading}
            key={message.id}
            message={message}
          />
        ))}
        {hasTurnError && <ChatErrorMessage error={error} />}
        {showErrorPill && (
          <PendingSendErrorPill error={sendError} onRetry={onRetry} />
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

export const ChatMessages = memo(ChatMessagesInternal);
