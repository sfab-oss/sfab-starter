import { Button } from "@workspace/ui/components/shadcn/button";
import { AlertCircleIcon, RefreshCcwIcon, XIcon } from "lucide-react";
import { useChatConnection } from "@/components/chat/window/chat-window";

function getErrorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return null;
}

/**
 * Inline, non-destructive turn-error banner. The conversation stays visible
 * (unlike a full-screen takeover) and the composer keeps working. Retry follows
 * the Think reference client: `clearError()` then `regenerate()` re-runs the
 * last turn against the server-authoritative Session tree — we deliberately do
 * NOT hand-pop messages with `setMessages`, which on Think only edits the local
 * view and leaves the errored turn in the persisted transcript.
 */
export function ChatErrorMessage({ error }: { error?: unknown }) {
  const { helpers } = useChatConnection();
  const message = getErrorMessage(error);
  const isBusy =
    helpers.status === "streaming" || helpers.status === "submitted";

  const handleRetry = () => {
    helpers.clearError();
    if (!isBusy) {
      helpers.regenerate();
    }
  };

  return (
    <output className="mx-auto flex w-full justify-center" role="alert">
      <div className="flex w-full max-w-md items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive text-sm">
        <AlertCircleIcon
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0"
        />
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="font-medium">Something went wrong</span>
          {message ? (
            <span className="break-words text-destructive/80 text-xs">
              {message}
            </span>
          ) : (
            <span className="text-destructive/80 text-xs">
              The response couldn't be completed. Try again.
            </span>
          )}
          <div className="flex gap-1.5">
            <Button
              className="h-7 gap-1.5 px-2 text-xs"
              disabled={isBusy}
              onClick={handleRetry}
              size="sm"
              variant="outline"
            >
              <RefreshCcwIcon className="size-3" />
              Retry
            </Button>
            <Button
              className="h-7 gap-1.5 px-2 text-muted-foreground text-xs"
              onClick={() => helpers.clearError()}
              size="sm"
              variant="ghost"
            >
              <XIcon className="size-3" />
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </output>
  );
}
