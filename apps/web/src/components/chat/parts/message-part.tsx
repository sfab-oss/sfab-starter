import type { AIDataPart } from "@workspace/contract/ai";
import { MessageResponse } from "@workspace/ui/components/ai-elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@workspace/ui/components/ai-elements/reasoning";
import { Bubble, BubbleContent } from "@workspace/ui/components/shadcn/bubble";
import { cn } from "@workspace/ui/lib/utils";
import {
  type DynamicToolUIPart,
  isToolUIPart,
  type ToolUIPart,
  type UIMessagePart,
  type UITools,
} from "ai";
import { CheckIcon, CircleIcon } from "lucide-react";
import { DefaultTool } from "@/components/chat/tools/default-tool";
import {
  getDisplayToolRenderer,
  getLiveToolRenderer,
} from "@/components/chat/tools/tool-registry";

export function MessagePart({
  part,
  messageId,
  partIndex,
  isLoading,
  isLastPart,
  role = "assistant",
}: {
  part: UIMessagePart<AIDataPart, UITools>;
  messageId: string;
  partIndex: number;
  isLoading: boolean;
  isLastPart: boolean;
  role?: "user" | "assistant" | "system";
}) {
  if (part.type === "text") {
    if (role === "user") {
      return (
        <Bubble align="end" variant="secondary">
          <BubbleContent>
            <MessageResponse className="text-base">{part.text}</MessageResponse>
          </BubbleContent>
        </Bubble>
      );
    }
    return (
      <Bubble variant="ghost">
        <BubbleContent className="w-full max-w-full">
          <MessageResponse className="text-base">{part.text}</MessageResponse>
        </BubbleContent>
      </Bubble>
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
      getLiveToolRenderer(toolPart) ??
      (toolPart.state === "output-available"
        ? getDisplayToolRenderer(toolPart)
        : undefined);
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
    const entries = part.data.entries;
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

  return null;
}
