import type { ChatContext } from "@workspace/contract/ai";
import { ChatVoiceButton } from "@workspace/ui/components/ai-elements/chat-voice-button";
import {
  ChatToken,
  ChatTokenGroup,
  ChatTokenIcon,
  ChatTokenLabel,
  ChatTokenRemove,
} from "@workspace/ui/components/shadcn/chat-token";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@workspace/ui/components/shadcn/input-group";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import type { ChatStatus, FileUIPart } from "ai";
import {
  ArrowUpIcon,
  FileIcon,
  Loader2Icon,
  PaperclipIcon,
  PlusIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { OutgoingMessage } from "@/components/chat/dock/chat-tabs-store";
import { PageContextChip } from "@/components/chat/page-context-chip";
import { usePageContext } from "@/components/providers/page-context";
import { useChatCapabilities } from "@/hooks/use-chat-capabilities";
import { m } from "@/paraglide/messages.js";

type ComposerFile = FileUIPart & { id: string };

function handleSendError(error: unknown) {
  console.error("Failed to send message:", error);

  if (error instanceof Error) {
    if (error.message.includes("network") || error.message.includes("fetch")) {
      toast.error(m.chat_toast_network());
    } else if (
      error.message.includes("rate limit") ||
      error.message.includes("429")
    ) {
      toast.error(m.chat_toast_rate_limit());
    } else if (error.message.includes("timeout")) {
      toast.error(m.chat_toast_timeout());
    } else {
      toast.error(m.chat_toast_send_failed({ message: error.message }));
    }
  } else {
    toast.error(m.chat_toast_unexpected());
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
      view: config.view,
    },
  };
}

function filePartsFromList(fileList: FileList | File[]): ComposerFile[] {
  return Array.from(fileList).map((file) => ({
    id: crypto.randomUUID(),
    type: "file" as const,
    filename: file.name,
    mediaType: file.type,
    url: URL.createObjectURL(file),
  }));
}

function ChatSubmitButton({
  disabled,
  onStop,
  status,
}: {
  disabled?: boolean;
  onStop?: () => void;
  status: ChatStatus;
}) {
  const isInFlight = status === "submitted" || status === "streaming";
  const actAsStop = isInFlight && onStop !== undefined;

  let icon = <ArrowUpIcon className="size-4" />;
  if (status === "submitted") {
    icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === "streaming") {
    icon = <SquareIcon className="size-4" />;
  } else if (status === "error") {
    icon = <XIcon className="size-4" />;
  }

  return (
    <InputGroupButton
      aria-label={actAsStop ? m.chat_stop() : m.chat_send()}
      disabled={disabled && !actAsStop}
      onClick={
        actAsStop
          ? (event) => {
              event.preventDefault();
              onStop();
            }
          : undefined
      }
      size="icon-sm"
      type={actAsStop ? "button" : "submit"}
      variant="default"
    >
      {icon}
      <span className="sr-only">
        {actAsStop ? m.chat_stop() : m.chat_send()}
      </span>
    </InputGroupButton>
  );
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
  const { data: capabilities } = useChatCapabilities();
  const supportsImageInput = capabilities?.supportsImageInput === true;
  const [text, setText] = useState("");
  const [files, setFiles] = useState<ComposerFile[]>([]);
  const [pinned, setPinned] = useState(false);
  const [pinnedContext, setPinnedContext] = useState(livePageContext);
  const [dismissed, setDismissed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textController = {
    value: text,
    setInput: setText,
    clear: () => setText(""),
  };

  // biome-ignore lint/plugin/no-use-effect: external sync — revisit per code-smells.md (ALW-672)
  useEffect(() => {
    if (!pinned && livePageContext) {
      setPinnedContext(livePageContext);
    }
  }, [pinned, livePageContext]);

  const displayContext = pinned ? pinnedContext : livePageContext;
  const effectivePageContext =
    dismissed || !displayContext ? undefined : displayContext;

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      for (const file of prev) {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      }
      return [];
    });
  }, []);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list);
      if (!supportsImageInput) {
        toast.error(
          "This chat model only accepts text. Remove attachments and try again."
        );
        return;
      }
      const images = incoming.filter((file) => file.type.startsWith("image/"));
      if (incoming.length > 0 && images.length === 0) {
        toast.error(
          "Only image attachments are supported. Remove other file types and try again."
        );
        return;
      }
      setFiles((prev) => [...prev, ...filePartsFromList(images)]);
    },
    [supportsImageInput]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const found = prev.find((file) => file.id === id);
      if (found?.url) {
        URL.revokeObjectURL(found.url);
      }
      return prev.filter((file) => file.id !== id);
    });
  }, []);

  const submit = useCallback(() => {
    if (disabled) {
      return;
    }

    const trimmed = text.trim();
    const hasAttachments = files.length > 0;
    if (!(trimmed || hasAttachments)) {
      return;
    }

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

    const outgoing: OutgoingMessage = {
      role: "user",
      parts: [
        { type: "text", text: trimmed || "Sent with attachments" },
        ...files.map(({ id: _id, ...file }) => file),
      ],
    };
    if (effectivePageContext) {
      outgoing.metadata = {
        pageContext: toOutgoingPageContext(effectivePageContext),
      };
    }

    setText("");
    clearFiles();
    onSubmit(outgoing).catch(handleSendError);
  }, [
    clearFiles,
    disabled,
    effectivePageContext,
    files,
    onSubmit,
    supportsImageInput,
    text,
  ]);

  const handleFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submit();
    },
    [submit]
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    },
    [submit]
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
    <form className="w-full" onSubmit={handleFormSubmit}>
      <input
        accept={supportsImageInput ? "image/*" : undefined}
        className="hidden"
        multiple
        onChange={(event) => {
          if (event.currentTarget.files?.length) {
            addFiles(event.currentTarget.files);
          }
          event.currentTarget.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />
      <InputGroup className="rounded-2xl">
        {displayContext || dismissed || files.length > 0 ? (
          <InputGroupAddon
            align="block-start"
            className="flex-wrap gap-1.5 pb-0"
          >
            <ChatTokenGroup>
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
              {files.map((file) => (
                <ChatToken key={file.id}>
                  <ChatTokenIcon>
                    {file.mediaType?.startsWith("image/") && file.url ? (
                      <img alt="" height={14} src={file.url} width={14} />
                    ) : (
                      <FileIcon />
                    )}
                  </ChatTokenIcon>
                  <ChatTokenLabel>
                    {file.filename ?? "Attachment"}
                  </ChatTokenLabel>
                  <ChatTokenRemove
                    label={`Remove ${file.filename ?? "attachment"}`}
                    onClick={() => removeFile(file.id)}
                  />
                </ChatToken>
              ))}
            </ChatTokenGroup>
          </InputGroupAddon>
        ) : null}
        <InputGroupTextarea
          className="max-h-60 overflow-y-auto"
          disabled={disabled}
          onChange={(event) => setText(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          value={text}
        />
        <InputGroupAddon align="block-end" className="pt-1">
          {supportsImageInput ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <InputGroupButton
                    aria-label="Add images"
                    size="icon-sm"
                    type="button"
                    variant="outline"
                  />
                }
              >
                <PlusIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44" side="top">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <PaperclipIcon />
                  Add images
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <ChatVoiceButton
              controller={{ textInput: textController }}
              labels={{
                start: m.chat_voice_start(),
                stop: m.chat_voice_stop(),
                stopAria: m.chat_voice_stop_aria(),
                processing: m.chat_voice_processing(),
                error: m.chat_voice_error(),
                unsupported: m.chat_voice_unsupported(),
                cancelled: m.chat_voice_cancelled(),
                transcriptionFailed: m.chat_voice_transcription_failed(),
                recordingFailed: m.chat_voice_recording_failed(),
                recordingTooShort: m.chat_voice_recording_too_short(),
                noTranscription: m.chat_voice_no_transcription(),
                micFailed: m.chat_voice_mic_failed(),
                micDenied: m.chat_voice_mic_denied(),
                micNotFound: m.chat_voice_mic_not_found(),
                micBusy: m.chat_voice_mic_busy(),
              }}
            />
            <ChatSubmitButton
              disabled={disabled}
              onStop={onStop}
              status={status}
            />
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}

export function ChatInput({
  disabled = false,
  onStop,
  onSubmit,
  placeholder = m.chat_placeholder_connected(),
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
        <ChatInputInner
          disabled={disabled}
          onStop={onStop}
          onSubmit={onSubmit}
          placeholder={placeholder}
          status={status}
        />
      </div>
    </div>
  );
}
