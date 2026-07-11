import { Button } from "@workspace/ui/components/shadcn/button";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/shadcn/tooltip";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";
import { Copy, RefreshCw } from "lucide-react";
import { memo, useMemo } from "react";
import { useChatConnection } from "@/components/chat/window/chat-window";

export function PureMessageActions({
  messageId,
  isLoading,
}: {
  messageId: string;
  isLoading?: boolean;
}) {
  const { helpers } = useChatConnection();
  const { messages, regenerate } = helpers;
  const message = useMemo(
    () => messages.find((m) => m.id === messageId),
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
      <TooltipProvider>
        <div
          className={cn(
            "flex items-center gap-1",
            showActionsWithoutHover
              ? ""
              : "opacity-0 transition-opacity duration-150 focus-within:opacity-100 hover:opacity-100 group-hover/message:opacity-100 group-hover:opacity-100"
          )}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={copyToClipboard}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <Copy className="size-4" />
              <span className="sr-only">Copy</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  onClick={() => regenerate({ messageId })}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                />
              }
            >
              <RefreshCw className="size-4" />
              <span className="sr-only">Regenerate</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Regenerate</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}

export const ChatMessageActions = memo(PureMessageActions);
