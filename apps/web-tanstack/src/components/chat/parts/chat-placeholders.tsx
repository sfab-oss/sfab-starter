import {
  PromptInputBody,
  PromptInputProvider,
  PromptInputTextarea,
} from "@workspace/ui/components/ai-elements/prompt-input";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/shadcn/tooltip";
import { AlertCircle, CheckIcon, ClipboardIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useChatEngine } from "../providers/chat-engine";

export function ChatMessagesSkeleton() {
  return (
    <div className="container mx-auto flex w-full flex-col gap-4 p-4 sm:max-w-2xl md:max-w-3xl">
      <div className="flex flex-col gap-2 self-end">
        <Skeleton className="h-10 w-48 rounded-lg" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-64 rounded" />
        <Skeleton className="h-4 w-80 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
    </div>
  );
}

export function ChatHistoryError() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <AlertCircle className="size-8" />
        <p className="text-sm">Failed to load chat history.</p>
      </div>
    </div>
  );
}

export function ChatInputPlaceholder() {
  return (
    <div className="relative bottom-0 z-10 w-full bg-background pt-2">
      <div className="mx-auto w-full p-2 @[500px]:px-4 @[500px]:pb-4 md:max-w-3xl @[500px]:md:pb-6">
        <PromptInputProvider>
          <PromptInputBody>
            <PromptInputTextarea disabled placeholder="Type a message..." />
          </PromptInputBody>
        </PromptInputProvider>
      </div>
    </div>
  );
}

export function ExportChatButton() {
  const { messages } = useChatEngine();
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(messages, null, 4));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [messages]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button onClick={handleCopy} size="icon" variant="ghost">
          {copied ? (
            <CheckIcon className="size-4" />
          ) : (
            <ClipboardIcon className="size-4" />
          )}
          <span className="sr-only">Export chat as JSON</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copied!" : "Export chat JSON"}</TooltipContent>
    </Tooltip>
  );
}
