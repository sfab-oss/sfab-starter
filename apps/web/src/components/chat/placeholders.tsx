import {
  PromptInputBody,
  PromptInputProvider,
  PromptInputTextarea,
} from "@workspace/ui/components/ai-elements/prompt-input";
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

export function ChatInputPlaceholder({ note }: { note?: string }) {
  return (
    <div className="relative bottom-0 z-10 w-full bg-background pt-2">
      <div className="mx-auto w-full p-2 @[500px]:px-4 @[500px]:pb-4 md:max-w-3xl @[500px]:md:pb-6">
        {note ? (
          <p className="mb-1.5 px-1 text-muted-foreground text-xs">{note}</p>
        ) : null}
        <PromptInputProvider>
          <PromptInputBody>
            <PromptInputTextarea disabled placeholder="Type a message..." />
          </PromptInputBody>
        </PromptInputProvider>
      </div>
    </div>
  );
}
