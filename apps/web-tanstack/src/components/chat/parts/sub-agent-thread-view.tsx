import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@workspace/ui/components/ai-elements/conversation";
import {
  Message,
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
import { useGetChat } from "@/hooks/use-chat";
import type { AIUIMessage } from "@/types/ai";
import { DefaultTool } from "../tools/default-tool";

export function SubAgentThreadView({ chatId }: { chatId: string }) {
  const { data, isLoading: isFetching } = useGetChat(chatId, {
    enabled: !!chatId,
    refetchInterval: 2000,
  });

  const messages = (data?.messages ?? []) as AIUIMessage[];
  const chatStatus = data?.status;
  const isProcessing = chatStatus === "processing";

  if (isFetching && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <span className="text-muted-foreground text-sm">
          Loading sub-agent thread...
        </span>
      </div>
    );
  }

  return (
    <Conversation className="h-full flex-1 overflow-y-hidden">
      <ConversationContent className="container mx-auto w-full gap-2 pb-6 sm:max-w-2xl md:max-w-3xl">
        {messages.map((message) => (
          <ReadOnlyMessage key={message.id} message={message} />
        ))}
        {isProcessing && (
          <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Sub-agent is working...
          </div>
        )}
        {chatStatus === "failed" && data?.lastError && (
          <div className="p-4 text-red-600 text-sm">
            Sub-agent failed: {data.lastError}
          </div>
        )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
}

function ReadOnlyMessage({ message }: { message: AIUIMessage }) {
  const otherParts = message.parts.filter((part) => part.type !== "file");

  return (
    <Message
      className={cn(
        "flex w-full flex-col gap-2",
        message.role === "user" && "items-end"
      )}
      from={message.role}
    >
      <MessageContent className="w-full">
        {otherParts.map((part, partIndex) => {
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
                key={`${message.id}-reasoning-${partIndex}`}
              >
                <ReasoningTrigger />
                <ReasoningContent>{part.text}</ReasoningContent>
              </Reasoning>
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
    </Message>
  );
}
