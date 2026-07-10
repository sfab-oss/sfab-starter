"use client";

import type { AIDataPart } from "@workspace/contract/ai";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@workspace/ui/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/ai-elements/reasoning";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@workspace/ui/components/ai-elements/tool";
import { cn } from "@workspace/ui/lib/utils";
import {
  type DynamicToolUIPart,
  isTextUIPart,
  isToolUIPart,
  type ToolUIPart,
  type UIMessagePart,
  type UITools,
} from "ai";
import { CheckIcon, CircleIcon, CopyIcon } from "lucide-react";
import type { GalleryChatMessage } from "../lib/mock-chat-messages";

function PlanPart({
  entries,
  messageId,
  partIndex,
}: {
  entries: AIDataPart["plan"]["entries"];
  messageId: string;
  partIndex: number;
}) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      className="my-2 flex flex-col gap-1 rounded-md border bg-muted/30 px-3 py-2"
      key={`${messageId}-plan-${partIndex}`}
    >
      {entries.map((entry, index) => {
        const done = entry.status === "completed";
        return (
          <div
            className="flex items-start gap-2 text-sm"
            // biome-ignore lint/suspicious/noArrayIndexKey: plan entries have no stable id
            key={`${messageId}-plan-${partIndex}-${index}`}
          >
            {done ? (
              <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <CircleIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className={cn(done && "text-muted-foreground line-through")}>
              {entry.content}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DefaultToolPart({
  part,
  messageId,
  partIndex,
}: {
  part: DynamicToolUIPart | ToolUIPart;
  messageId: string;
  partIndex: number;
}) {
  const toolName =
    "toolName" in part && typeof part.toolName === "string"
      ? part.toolName
      : part.type.slice(5);

  return (
    <Tool defaultOpen={false} key={`${messageId}-tool-${partIndex}`}>
      <ToolHeader
        state={part.state}
        title={toolName.replace(/_/g, " ")}
        type={`tool-${toolName}` as ToolUIPart["type"]}
      />
      <ToolContent>
        <ToolInput input={part.input} />
        <ToolOutput errorText={part.errorText} output={part.output} />
      </ToolContent>
    </Tool>
  );
}

function GalleryMessagePart({
  part,
  messageId,
  partIndex,
  isLastPart,
  isStreaming,
}: {
  part: UIMessagePart<AIDataPart, UITools>;
  messageId: string;
  partIndex: number;
  isLastPart: boolean;
  isStreaming: boolean;
}) {
  if (part.type === "text") {
    return (
      <MessageResponse
        className="text-base"
        key={`${messageId}-text-${partIndex}`}
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
        isStreaming={isStreaming && isLastPart}
        key={`${messageId}-reasoning-${partIndex}`}
      >
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    );
  }

  if (part.type === "dynamic-tool" || isToolUIPart(part)) {
    return (
      <DefaultToolPart
        key={`${messageId}-tool-${partIndex}`}
        messageId={messageId}
        part={part as DynamicToolUIPart | ToolUIPart}
        partIndex={partIndex}
      />
    );
  }

  if (part.type === "data-plan") {
    return (
      <PlanPart
        entries={part.data.entries}
        key={`${messageId}-plan-${partIndex}`}
        messageId={messageId}
        partIndex={partIndex}
      />
    );
  }

  return null;
}

export function ChatMessageRow({
  message,
  isStreaming = false,
}: {
  message: GalleryChatMessage;
  isStreaming?: boolean;
}) {
  const textForCopy = message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("\n\n");

  return (
    <Message
      className={cn(
        "flex w-full flex-col gap-2",
        message.role === "user" && "items-end"
      )}
      from={message.role}
    >
      <MessageContent className="w-full">
        {message.parts.map((part, partIndex) => (
          <GalleryMessagePart
            isLastPart={partIndex === message.parts.length - 1}
            isStreaming={isStreaming}
            // biome-ignore lint/suspicious/noArrayIndexKey: part order within a message is stable
            key={`${message.id}-part-${partIndex}`}
            messageId={message.id}
            part={part}
            partIndex={partIndex}
          />
        ))}
      </MessageContent>
      {message.role === "assistant" && textForCopy ? (
        <MessageActions>
          <MessageAction
            label="Copy"
            onClick={() => navigator.clipboard.writeText(textForCopy)}
            tooltip="Copy"
          >
            <CopyIcon className="size-3.5" />
          </MessageAction>
        </MessageActions>
      ) : null}
    </Message>
  );
}
