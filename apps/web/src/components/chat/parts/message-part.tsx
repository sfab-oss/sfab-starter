import { MessageResponse } from "@workspace/ui/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/ai-elements/reasoning";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  type DynamicToolUIPart,
  isToolUIPart,
  type ToolUIPart,
  type UIDataTypes,
  type UIMessagePart,
  type UITools,
} from "ai";
import { CheckIcon, CircleIcon } from "lucide-react";
import { DefaultTool } from "@/components/chat/tools/default-tool";
import { getDisplayToolRenderer } from "@/components/chat/tools/tool-registry";

/**
 * Renders ONE `UIMessage` part for org chat transcripts.
 * File parts are handled by the caller (attachments row), so they are
 * intentionally not switched here.
 */
export function MessagePart({
  part,
  messageId,
  partIndex,
  isLoading,
  isLastPart,
}: {
  part: UIMessagePart<UIDataTypes, UITools>;
  messageId: string;
  partIndex: number;
  isLoading: boolean;
  isLastPart: boolean;
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
        isStreaming={isLoading && isLastPart}
        key={`${messageId}-reasoning-${partIndex}`}
      >
        <ReasoningTrigger />
        <ReasoningContent>{part.text}</ReasoningContent>
      </Reasoning>
    );
  }

  if (part.type === "dynamic-tool" || isToolUIPart(part)) {
    const toolPart = part as DynamicToolUIPart | ToolUIPart;
    const Renderer =
      toolPart.state === "output-available"
        ? getDisplayToolRenderer(toolPart)
        : undefined;
    if (Renderer) {
      return (
        <Renderer key={`${messageId}-tool-${partIndex}`} part={toolPart} />
      );
    }
    return (
      <DefaultTool key={`${messageId}-tool-${partIndex}`} part={toolPart} />
    );
  }

  if (part.type === "data-plan") {
    const entries =
      (part.data as { entries?: { content: string; status?: string }[] })
        .entries ?? [];
    if (entries.length === 0) {
      return null;
    }
    return (
      <div
        className="my-2 flex flex-col gap-1 rounded-md border bg-muted/30 px-3 py-2"
        key={`${messageId}-plan-${partIndex}`}
      >
        {entries.map((entry, i) => {
          const done = entry.status === "completed";
          return (
            <div
              className="flex items-start gap-2 text-sm"
              // biome-ignore lint/suspicious/noArrayIndexKey: plan entries have no stable id
              key={i}
            >
              {done ? (
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              ) : (
                <CircleIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={cn(done && "text-muted-foreground line-through")}
              >
                {entry.content}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (part.type === "data-banner") {
    const data = part.data as { variant?: "error" | "info"; text?: string };
    return (
      <div
        className="my-2 flex justify-center"
        key={`${messageId}-banner-${partIndex}`}
      >
        <Badge variant={data.variant === "error" ? "destructive" : "secondary"}>
          {data.text}
        </Badge>
      </div>
    );
  }

  if (part.type === "data-acp") {
    // Lossless catch-all for un-mapped ACP kinds: kept in the message object,
    // surfaced as a muted breadcrumb so the renderer never crashes on a kind it
    // doesn't model (ADR-0009 AC-4).
    const data = part.data as { sessionUpdate?: string };
    return (
      <p
        className="my-0.5 text-muted-foreground text-xs"
        key={`${messageId}-acp-${partIndex}`}
      >
        · {data.sessionUpdate ?? "event"}
      </p>
    );
  }

  return null;
}
