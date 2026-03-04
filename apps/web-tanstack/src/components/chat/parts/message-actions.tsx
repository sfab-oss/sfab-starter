import {
  MessageAction,
  MessageActions as MessageActionsContainer,
} from "@workspace/ui/components/ai-elements/message";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { Copy, RefreshCw } from "lucide-react";
import { memo, useMemo } from "react";
import { useChatContext } from "../chat-provider";

export function PureMessageActions({
  messageId,
  isLoading,
}: {
  messageId: string;
  isLoading?: boolean;
}) {
  const { messages, regenerate } = useChatContext();
  const message = useMemo(
    () => messages.find((message) => message.id === messageId),
    [messages, messageId]
  );
  const isMobile = useIsMobile();

  const copyToClipboard = async () => {
    if (!message) {
      return;
    }

    const textFromParts = message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();

    if (!textFromParts) {
      toast.error("There's no text to copy!");
      return;
    }

    await navigator.clipboard.writeText(textFromParts);
    toast.success("Copied to clipboard!");
  };

  if (isLoading) {
    return <div className="h-7" />;
  }

  const showActionsWithoutHover = isMobile || message?.role === "assistant";

  return (
    <div className="flex items-center gap-2">
      <MessageActionsContainer
        className={
          showActionsWithoutHover
            ? ""
            : "opacity-0 transition-opacity duration-150 focus-within:opacity-100 hover:opacity-100 group-hover/message:opacity-100 group-hover:opacity-100"
        }
      >
        <MessageAction
          className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={copyToClipboard}
          tooltip="Copy"
        >
          <Copy className="size-4" />
        </MessageAction>

        <MessageAction
          className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => regenerate({ messageId })}
          tooltip="Regenerate"
        >
          <RefreshCw className="size-4" />
        </MessageAction>
      </MessageActionsContainer>
    </div>
  );
}

export const ChatMessageActions = memo(PureMessageActions);
