import {
  PromptInputBody,
  PromptInputProvider,
  PromptInputTextarea,
} from "@workspace/ui/components/ai-elements/prompt-input";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { AlertCircle } from "lucide-react";

export function ChatHistoryError() {
  return (
    <div className="flex items-center justify-center px-2 py-4">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <AlertCircle className="size-6" />
        <p className="text-xs">Failed to load chat history.</p>
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
