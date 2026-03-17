import type { AIUIMessage } from "@/types/ai";
import { formatErrorForUser } from "../context/error-recovery";

/**
 * Creates onFinish/onError callbacks for createUIMessageStream that handle:
 * - The SDK calling onFinish even after onError (guarded with errored flag)
 * - Properly awaiting async onError before onFinish can race
 */
export function createCompletionCallbacks({
  onUpsertMessage,
  onComplete,
  onError,
  cleanupTimeout,
}: {
  onUpsertMessage: (message: AIUIMessage) => Promise<void>;
  onComplete?: () => Promise<void>;
  onError?: (error: unknown) => Promise<void>;
  cleanupTimeout: () => void;
}) {
  let errored = false;

  return {
    onFinish: async ({ responseMessage }: { responseMessage: AIUIMessage }) => {
      cleanupTimeout();
      await onUpsertMessage(responseMessage);
      if (!errored) {
        await onComplete?.();
      }
    },
    onError: (error: unknown): string => {
      errored = true;
      cleanupTimeout();
      console.error("[agentRespond] onError:", error);
      // Fire-and-forget is intentional — onError must return a string synchronously.
      onError?.(error).catch((e) =>
        console.error("[agentRespond] onError callback failed:", e)
      );
      return formatErrorForUser(error);
    },
  };
}
