import { Button } from "@workspace/ui/components/shadcn/button";
import { RefreshCcwIcon } from "lucide-react";
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

export function ChatErrorMessage({ error }: { error?: unknown }) {
  const { helpers } = useChatConnection();
  const message = getErrorMessage(error);

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-4 rounded-lg px-6 py-8 shadow-xs md:max-w-2xl">
      <div className="flex items-center gap-2">
        <svg
          aria-label="Error icon"
          className="h-5 w-5"
          fill="currentColor"
          role="img"
          viewBox="0 0 20 20"
        >
          <path
            clipRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            fillRule="evenodd"
          />
        </svg>
        <p className="font-medium">Something went wrong</p>
      </div>
      {message ? (
        <pre className="w-full overflow-x-auto rounded-md bg-muted p-3 text-left text-xs">
          {message}
        </pre>
      ) : (
        <p className="text-center text-sm">
          An error occurred while processing your request. Please try again.
        </p>
      )}
      <Button
        onClick={() => {
          // Pop the failed assistant turn and let `useAgentChat` reconnect
          // its WebSocket on its own. Reloading the page would drop the WS,
          // re-run the protected route loader, and refetch project data —
          // overkill for a single failed turn.
          helpers.setMessages((messages) => messages.slice(0, -1));
        }}
        variant="outline"
      >
        <RefreshCcwIcon className="mr-2 h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
