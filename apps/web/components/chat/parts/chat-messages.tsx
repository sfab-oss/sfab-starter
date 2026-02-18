"use client";

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
  MessageResponse,
} from "@workspace/ui/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/ai-elements/reasoning";
import { cn } from "@workspace/ui/lib/utils";
import { isToolUIPart } from "ai";
import { memo } from "react";
import { LoadSkillTool } from "@/components/chat/tools/load-skill-tool";
import type { AIUIMessage } from "@/types/ai";
import { useChatContext } from "../chat-provider";
import { DefaultTool } from "../tools/default-tool";
import { ChatErrorMessage } from "./chat-error-message";
import { ChatMessageActions } from "./message-actions";

function ChatMessage({
  message,
  isLoading,
}: {
  message: AIUIMessage;
  isLoading: boolean;
}) {
  const fileParts = message.parts.filter((part) => part.type === "file");
  const otherParts = message.parts.filter((part) => part.type !== "file");

  return (
    <Message
      className={cn(
        "flex w-full flex-col gap-2",
        message.role === "user" && "items-end"
      )}
      from={message.role}
      key={message.id}
    >
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
        {otherParts.map((part, partIndex) => {
          const isLastPart = partIndex === otherParts.length - 1;

          if (part.type === "text") {
            return (
              <MessageResponse
                className="text-base"
                key={`${message.id}-text-${partIndex}`}
              >
                {part.text}
              </MessageResponse>
            );
          }

          if (part.type === "reasoning") {
            return (
              <Reasoning
                className="my-2"
                defaultOpen={true}
                isStreaming={isLoading && isLastPart}
                key={`${message.id}-reasoning-${partIndex}`}
              >
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
            );
          }

          if (part.type === "tool-load-skill") {
            return (
              <LoadSkillTool
                key={`${message.id}-tool-load-skill-${partIndex}`}
                part={part}
              />
            );
          }

          if (part.type === "dynamic-tool" || isToolUIPart(part)) {
            return (
              <DefaultTool
                key={`${message.id}-tool-${partIndex}`}
                part={part}
              />
            );
          }
          return null;
        })}
      </MessageContent>

      <ChatMessageActions isLoading={isLoading} messageId={message.id} />
    </Message>
  );
}

function ChatMessageListInternal({ className }: { className?: string }) {
  const { status, messages, error } = useChatContext();
  const isLoading = status === "streaming" || status === "submitted";

  if (status === "error" || error) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <ChatErrorMessage />
      </div>
    );
  }

  if (messages.length === 0) {
    return <ConversationEmptyState />;
  }

  return (
    <Conversation className={cn("h-full flex-1 overflow-y-hidden", className)}>
      <ConversationContent className="container mx-auto w-full gap-2 pb-6 sm:max-w-2xl md:max-w-3xl">
        {messages.map((message) => {
          return (
            <ChatMessage
              isLoading={isLoading}
              key={message.id}
              message={message}
            />
          );
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

export const ChatMessages = memo(ChatMessageListInternal);
