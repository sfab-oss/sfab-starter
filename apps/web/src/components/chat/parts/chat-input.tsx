import type { ChatContext } from "@workspace/contract/ai";
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
import type { ChatStatus } from "ai";
import { useCallback, useEffect, useState } from "react";
import type { OutgoingMessage } from "@/components/chat/dock/chat-tabs-store";
import { PageContextChip } from "@/components/chat/page-context-chip";
import { usePageContext } from "@/components/providers/page-context";
import { useChatCapabilities } from "@/hooks/use-chat-capabilities";

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

function toOutgoingPageContext(
  config: NonNullable<ChatContext["page"]>
): NonNullable<OutgoingMessage["metadata"]>["pageContext"] {
  return {
    page: config.entityType ?? config.title ?? "page",
    params: {
      entityType: config.entityType,
      entityId: config.entityId,
      title: config.title,
    },
  };
}

interface ChatInputInnerProps {
  disabled: boolean;
  onStop?: () => void;
  onSubmit: (message: OutgoingMessage) => Promise<unknown>;
  placeholder: string;
  status: ChatStatus;
}

function ChatInputInner({
  disabled,
  onStop,
  onSubmit,
  placeholder,
  status,
}: ChatInputInnerProps) {
  const livePageContext = usePageContext();
  const controller = usePromptInputController();
  const { data: capabilities } = useChatCapabilities();
  // Default closed until capabilities load — avoids a flash of attach on
  // text-only providers (zai-coding-plan / workers-ai).
  const supportsImageInput = capabilities?.supportsImageInput === true;
  const [pinned, setPinned] = useState(false);
  const [pinnedContext, setPinnedContext] = useState(livePageContext);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!pinned && livePageContext) {
      setPinnedContext(livePageContext);
    }
  }, [pinned, livePageContext]);

  const displayContext = pinned ? pinnedContext : livePageContext;
  const effectivePageContext =
    dismissed || !displayContext ? undefined : displayContext;

  const handleSubmit = useCallback(
    (message: PromptInputMessage) => {
      if (disabled) {
        return;
      }

      const { text, files } = message;
      const hasText = Boolean(text);
      const hasAttachments = Boolean(files?.length);

      if (!(hasText || hasAttachments)) {
        return;
      }

      // Client-side gate (ALW-453): never hit the API with parts the active
      // provider rejects. Mirrors `gateChatAttachments` on the server.
      if (hasAttachments && !supportsImageInput) {
        toast.error(
          "This chat model only accepts text. Remove attachments and try again."
        );
        return;
      }
      if (
        hasAttachments &&
        files.some((file) => !file.mediaType?.startsWith("image/"))
      ) {
        toast.error(
          "Only image attachments are supported. Remove other file types and try again."
        );
        return;
      }

      controller.attachments.clear();
      controller.textInput.clear();

      const outgoing: OutgoingMessage = {
        role: "user",
        parts: [
          { type: "text", text: text || "Sent with attachments" },
          ...(files || []),
        ],
      };
      if (effectivePageContext) {
        outgoing.metadata = {
          pageContext: toOutgoingPageContext(effectivePageContext),
        };
      }

      onSubmit(outgoing).catch(handleSendError);
    },
    [
      disabled,
      onSubmit,
      controller.attachments,
      controller.textInput,
      effectivePageContext,
      supportsImageInput,
    ]
  );

  const handlePinToggle = useCallback(() => {
    if (pinned) {
      setPinned(false);
      return;
    }
    if (displayContext) {
      setPinnedContext(displayContext);
    }
    setPinned(true);
  }, [pinned, displayContext]);

  return (
    <>
      {displayContext || dismissed ? (
        <PageContextChip
          context={displayContext ?? null}
          dismissed={dismissed}
          onDismiss={() => setDismissed(true)}
          onPinToggle={handlePinToggle}
          onRestore={() => setDismissed(false)}
          pinned={pinned}
        />
      ) : null}
      <PromptInput
        accept={supportsImageInput ? "image/*" : undefined}
        className="rounded-2xl"
        globalDrop={supportsImageInput}
        multiple
        onError={(err) => {
          if (err.code === "accept") {
            toast.error(
              "Only image attachments are supported for this chat model."
            );
            return;
          }
          toast.error(err.message);
        }}
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
            {supportsImageInput ? (
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments label="Add images" />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
            ) : null}
          </PromptInputTools>
          <PromptInputTools className="gap-2">
            <ChatVoiceButton controller={controller} />
            <PromptInputSubmit
              disabled={disabled}
              onStop={onStop}
              status={status}
            />
          </PromptInputTools>
        </PromptInputFooter>
      </PromptInput>
    </>
  );
}

export function ChatInput({
  disabled = false,
  onStop,
  onSubmit,
  placeholder = "Ask anything about your organization...",
  status,
}: {
  disabled?: boolean;
  onStop?: () => void;
  onSubmit: (message: OutgoingMessage) => Promise<unknown>;
  placeholder?: string;
  status: ChatStatus;
}) {
  return (
    <div className="relative bottom-0 z-10 w-full bg-background pt-2">
      <div className="mx-auto w-full p-2 @[500px]:px-4 @[500px]:pb-4 md:max-w-3xl @[500px]:md:pb-6">
        <PromptInputProvider>
          <ChatInputInner
            disabled={disabled}
            onStop={onStop}
            onSubmit={onSubmit}
            placeholder={placeholder}
            status={status}
          />
        </PromptInputProvider>
      </div>
    </div>
  );
}
