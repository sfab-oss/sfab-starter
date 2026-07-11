"use client";

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
import type { ChatStatus, FileUIPart } from "ai";
import {
  ArrowUpIcon,
  FileIcon,
  Loader2Icon,
  PaperclipIcon,
  PlusIcon,
  SquareIcon,
} from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useRef,
  useState,
} from "react";

export interface ChatDockPromptMessage {
  text: string;
  files: FileUIPart[];
}

type ComposerFile = FileUIPart & { id: string };

function ChatSubmitButton({
  disabled,
  status,
}: {
  disabled?: boolean;
  status: ChatStatus;
}) {
  const isSubmitted = status === "submitted";
  const isStreaming = status === "streaming";
  let icon = <ArrowUpIcon className="size-4" />;
  if (isSubmitted) {
    icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (isStreaming) {
    icon = <SquareIcon className="size-4" />;
  }
  return (
    <InputGroupButton
      aria-label="Send"
      disabled={disabled || isSubmitted}
      size="icon-sm"
      type="submit"
      variant="default"
    >
      {icon}
      <span className="sr-only">Send</span>
    </InputGroupButton>
  );
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

function ChatInputInner({
  disabled,
  onSubmit,
  placeholder,
  status,
}: {
  disabled: boolean;
  onSubmit: (message: ChatDockPromptMessage) => void | Promise<void>;
  placeholder: string;
  status: ChatStatus;
}) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<ComposerFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textController = {
    value: text,
    setInput: setText,
    clear: () => setText(""),
  };

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

  const addFiles = useCallback((list: FileList | File[]) => {
    setFiles((prev) => [...prev, ...filePartsFromList(list)]);
  }, []);

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
    if (!(trimmed || files.length > 0)) {
      return;
    }
    const payload: ChatDockPromptMessage = {
      text: trimmed,
      files: files.map(({ id: _id, ...file }) => file),
    };
    setText("");
    clearFiles();
    Promise.resolve(onSubmit(payload)).catch(() => undefined);
  }, [clearFiles, disabled, files, onSubmit, text]);

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

  return (
    <form className="w-full" onSubmit={handleFormSubmit}>
      <input
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
        {files.length > 0 ? (
          <InputGroupAddon align="block-start" className="pb-0">
            <ChatTokenGroup>
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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <InputGroupButton
                  aria-label="Add files"
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
                Add files
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto flex items-center gap-2">
            <ChatVoiceButton controller={{ textInput: textController }} />
            <ChatSubmitButton disabled={disabled} status={status} />
          </div>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}

export function GalleryChatInput({
  disabled = false,
  onSubmit,
  placeholder = "Ask anything about your organization...",
  status,
}: {
  disabled?: boolean;
  onSubmit: (message: ChatDockPromptMessage) => void | Promise<void>;
  placeholder?: string;
  status: ChatStatus;
}) {
  return (
    <div className="relative bottom-0 z-10 w-full bg-background pt-2">
      <div className="mx-auto w-full p-2 @[500px]:px-4 @[500px]:pb-4 md:max-w-3xl @[500px]:md:pb-6">
        <ChatInputInner
          disabled={disabled}
          onSubmit={onSubmit}
          placeholder={placeholder}
          status={status}
        />
      </div>
    </div>
  );
}
