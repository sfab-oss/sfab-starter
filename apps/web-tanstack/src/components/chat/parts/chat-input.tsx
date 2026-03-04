import { useParams, useRouterState } from "@tanstack/react-router";
import type { ChatContext } from "@workspace/types/ai";
import { ChatVoiceButton } from "@workspace/ui/components/ai-elements/chat-voice-button";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputController,
} from "@workspace/ui/components/ai-elements/prompt-input";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { useCallback, useMemo } from "react";
import { useCurrentPageConfig } from "../chat-page-config";
import { useChatContext } from "../chat-provider";

function handleSendError(error: unknown) {
  console.error("Failed to send message:", error);

  if (error instanceof Error) {
    if (error.message.includes("network") || error.message.includes("fetch")) {
      toast.error("Network error. Please check your connection and try again.");
    } else if (
      error.message.includes("rate limit") ||
      error.message.includes("429")
    ) {
      toast.error(
        "Too many requests. Please wait a moment before trying again."
      );
    } else if (error.message.includes("timeout")) {
      toast.error("Request timed out. Please try again.");
    } else {
      toast.error(`Failed to send message: ${error.message}`);
    }
  } else {
    toast.error("An unexpected error occurred. Please try again.");
  }
}

function ChatInputInner({
  additionalContext,
  placeholder,
}: {
  additionalContext?: Partial<ChatContext>;
  placeholder: string;
}) {
  const { sendMessage, status } = useChatContext();
  const controller = usePromptInputController();

  const routerState = useRouterState();
  const params = useParams({ strict: false });
  const pageConfig = useCurrentPageConfig();

  const fullContext = useMemo<ChatContext>(() => {
    const paramsRecord: Record<string, string> = {};
    const paramsObj = params as Record<string, unknown>;
    for (const [key, value] of Object.entries(paramsObj)) {
      if (typeof value === "string") {
        paramsRecord[key] = value;
      } else if (Array.isArray(value)) {
        paramsRecord[key] = (value as string[]).join("/");
      }
    }

    return {
      route: {
        pathname: routerState.location.pathname,
        params: Object.keys(paramsRecord).length > 0 ? paramsRecord : undefined,
      },
      page: pageConfig,
      ...additionalContext,
    };
  }, [routerState.location.pathname, params, pageConfig, additionalContext]);

  const handleSubmit = useCallback(
    async (message: PromptInputMessage) => {
      const { text, files } = message;
      const hasText = Boolean(text);
      const hasAttachments = Boolean(files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      try {
        controller.attachments.clear();
        controller.textInput.clear();
        const result = await sendMessage(
          {
            role: "user",
            parts: [
              { type: "text", text: text || "Sent with attachments" },
              ...(files || []),
            ],
          },
          {
            body: {
              context: fullContext,
            },
          }
        );

        return result;
      } catch (error) {
        handleSendError(error);
        throw error;
      }
    },
    [sendMessage, fullContext, controller.attachments, controller.textInput]
  );

  return (
    <PromptInput
      className="rounded-2xl"
      globalDrop
      multiple
      onSubmit={handleSubmit}
    >
      <PromptInputAttachments>
        {(attachment) => <PromptInputAttachment data={attachment} />}
      </PromptInputAttachments>
      <PromptInputBody>
        <PromptInputTextarea placeholder={placeholder} />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputActionMenu>
            <PromptInputActionMenuTrigger />
            <PromptInputActionMenuContent>
              <PromptInputActionAddAttachments />
            </PromptInputActionMenuContent>
          </PromptInputActionMenu>
        </PromptInputTools>
        <PromptInputTools className="gap-2">
          <ChatVoiceButton controller={controller} />
          <PromptInputSubmit status={status} />
        </PromptInputTools>
      </PromptInputFooter>
    </PromptInput>
  );
}

export function ChatInput({
  additionalContext,
  placeholder = "Type a message...",
}: {
  additionalContext?: Partial<ChatContext>;
  placeholder?: string;
}) {
  return (
    <div className="relative bottom-0 z-10 w-full bg-background pt-2">
      <div className="mx-auto w-full p-2 @[500px]:px-4 @[500px]:pb-4 md:max-w-3xl @[500px]:md:pb-6">
        <PromptInputProvider>
          <ChatInputInner
            additionalContext={additionalContext}
            placeholder={placeholder}
          />
        </PromptInputProvider>
      </div>
    </div>
  );
}
