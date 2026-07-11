"use client";

import {
  ChatInput,
  ChatInputEditor,
  ChatInputMentionButton,
  ChatInputSubmitButton,
} from "@workspace/ui/components/ai-elements/chat-input";
import { ChatVoiceButton } from "@workspace/ui/components/ai-elements/chat-voice-button";
import {
  ChatToken,
  ChatTokenGroup,
  ChatTokenIcon,
  ChatTokenLabel,
  ChatTokenRemove,
} from "@workspace/ui/components/shadcn/chat-token";
import {
  InputGroupAddon,
  InputGroupButton,
} from "@workspace/ui/components/shadcn/input-group";
import type { ChatStatus, FileUIPart } from "ai";
import { FileIcon, PaperclipIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  MOCK_COMMANDS,
  MOCK_MEMBERS,
  type MockCommand,
  type MockMember,
} from "../lib/mock-members";

export interface ChatDockPromptMessage {
  text: string;
  files: FileUIPart[];
  members?: MockMember[];
  commands?: MockCommand[];
}

type ComposerFile = FileUIPart & { id: string };

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
  onClear,
  onSubmit,
  placeholder,
  status,
}: {
  disabled: boolean;
  onClear?: () => void;
  onSubmit: (message: ChatDockPromptMessage) => void | Promise<void>;
  placeholder: string;
  status: ChatStatus;
}) {
  const [files, setFiles] = useState<ComposerFile[]>([]);
  const [composerKey, setComposerKey] = useState(0);
  const [seedText, setSeedText] = useState("");
  const textRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const textController = {
    get value() {
      return textRef.current;
    },
    setInput: (value: string) => {
      textRef.current = value;
      setSeedText(value);
      setComposerKey((key) => key + 1);
    },
    clear: () => {
      textRef.current = "";
      setSeedText("");
      setComposerKey((key) => key + 1);
    },
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

  return (
    <div className="w-full">
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
      <ChatInput
        className="rounded-2xl"
        defaultValue={seedText}
        disabled={disabled}
        key={composerKey}
        mentions={{
          member: {
            trigger: "@",
            items: MOCK_MEMBERS,
          },
          command: {
            trigger: "/",
            items: MOCK_COMMANDS,
            render: (item, selected) => (
              <div className="flex min-w-0 flex-col text-left">
                <span className="font-medium text-sm">/{item.name}</span>
                <span
                  className={
                    selected
                      ? "text-accent-foreground/70 text-xs"
                      : "text-muted-foreground text-xs"
                  }
                >
                  {item.description}
                </span>
              </div>
            ),
          },
        }}
        onParsedChange={(parsed) => {
          textRef.current = parsed.text;
        }}
        onSubmit={(parsed, { clear, focus }) => {
          const commands = parsed.command ?? [];
          const members = parsed.member;

          if (commands.some((command) => command.id === "clear")) {
            console.info("chat-dock command: clear", commands);
            onClear?.();
            clearFiles();
            clear();
            focus();
            return;
          }

          if (commands.some((command) => command.id === "help")) {
            console.info("chat-dock command: help", commands);
            const helpText = MOCK_COMMANDS.map(
              (command) => `/${command.name} — ${command.description}`
            ).join("\n");
            clearFiles();
            clear();
            focus();
            Promise.resolve(
              onSubmit({
                text: `Help\n${helpText}`,
                files: [],
                commands,
                members,
              })
            ).catch(() => undefined);
            return;
          }

          if (commands.some((command) => command.id === "summarize")) {
            console.info("chat-dock command: summarize", commands);
            clearFiles();
            clear();
            focus();
            Promise.resolve(
              onSubmit({
                text: "Summarize this conversation.",
                files: [],
                commands,
                members,
              })
            ).catch(() => undefined);
            return;
          }

          const trimmed = parsed.text.trim();
          if (!(trimmed || files.length > 0)) {
            return;
          }
          const payload: ChatDockPromptMessage = {
            text: trimmed,
            files: files.map(({ id: _id, ...file }) => file),
            members,
            commands: commands.length > 0 ? commands : undefined,
          };
          clearFiles();
          clear();
          focus();
          Promise.resolve(onSubmit(payload)).catch(() => undefined);
        }}
        status={status}
      >
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
        <ChatInputEditor placeholder={placeholder} />
        <InputGroupAddon align="block-end" className="pt-1">
          <ChatInputMentionButton />
          <InputGroupButton
            aria-label="Add files"
            onClick={() => fileInputRef.current?.click()}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <PaperclipIcon />
          </InputGroupButton>
          <div className="ml-auto flex items-center gap-2">
            <ChatVoiceButton controller={{ textInput: textController }} />
            <ChatInputSubmitButton />
          </div>
        </InputGroupAddon>
      </ChatInput>
    </div>
  );
}

export function GalleryChatInput({
  disabled = false,
  onClear,
  onSubmit,
  placeholder = "Ask anything about your organization...",
  status,
}: {
  disabled?: boolean;
  onClear?: () => void;
  onSubmit: (message: ChatDockPromptMessage) => void | Promise<void>;
  placeholder?: string;
  status: ChatStatus;
}) {
  return (
    <div className="relative bottom-0 z-10 w-full bg-background pt-2">
      <div className="mx-auto w-full p-2 @[500px]:px-4 @[500px]:pb-4 md:max-w-3xl @[500px]:md:pb-6">
        <ChatInputInner
          disabled={disabled}
          onClear={onClear}
          onSubmit={onSubmit}
          placeholder={placeholder}
          status={status}
        />
      </div>
    </div>
  );
}
