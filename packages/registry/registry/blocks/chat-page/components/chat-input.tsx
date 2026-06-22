"use client";

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
import type { ChatStatus } from "ai";
import { useCallback } from "react";

function ChatInputInner({
  disabled,
  onSubmit,
  placeholder,
  status,
}: {
  disabled: boolean;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  placeholder: string;
  status: ChatStatus;
}) {
  const controller = usePromptInputController();

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

      controller.attachments.clear();
      controller.textInput.clear();

      return onSubmit(message);
    },
    [disabled, onSubmit, controller.attachments, controller.textInput]
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
          <PromptInputSubmit disabled={disabled} status={status} />
        </PromptInputTools>
      </PromptInputFooter>
    </PromptInput>
  );
}

export function GalleryChatInput({
  disabled = false,
  onSubmit,
  placeholder = "Ask anything about your organization...",
  status,
}: {
  disabled?: boolean;
  onSubmit: (message: PromptInputMessage) => void | Promise<void>;
  placeholder?: string;
  status: ChatStatus;
}) {
  return (
    <div className="relative bottom-0 z-10 w-full bg-background pt-2">
      <div className="mx-auto w-full p-2 @[500px]:px-4 @[500px]:pb-4 md:max-w-3xl @[500px]:md:pb-6">
        <PromptInputProvider>
          <ChatInputInner
            disabled={disabled}
            onSubmit={onSubmit}
            placeholder={placeholder}
            status={status}
          />
        </PromptInputProvider>
      </div>
    </div>
  );
}
