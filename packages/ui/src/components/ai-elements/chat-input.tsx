"use client";

import { Extension } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor, JSONContent } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  InputGroup,
  InputGroupButton,
} from "@workspace/ui/components/shadcn/input-group";
import { cn } from "@workspace/ui/lib/utils";
import type { ChatStatus } from "ai";
import {
  ArrowUpIcon,
  AtSignIcon,
  Loader2Icon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type BaseMentionItem,
  buildMentionExtensions,
  type MentionConfig,
  type MentionConfigs,
  parseEditorContent,
  type SelectedMentionItems,
} from "./chat-input-mentions";

export type { BaseMentionItem, MentionConfig } from "./chat-input-mentions";

// Mapped + intersection shape — cannot be an interface.
export type ChatInputParsed<Items extends Record<string, BaseMentionItem>> = {
  text: string;
} & { [K in keyof Items]?: Items[K][] };

export interface ChatInputHandle {
  clear: () => void;
  focus: () => void;
  setText: (text: string) => void;
  insertText: (text: string) => void;
}

interface ChatInputHelpers {
  clear: () => void;
  focus: () => void;
}

interface ChatInputContextValue {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  submit: () => void;
  status?: ChatStatus;
  onStop?: () => void;
  disabled: boolean;
  defaultValue?: string;
  mentions: MentionConfigs | undefined;
  mentionsRef: RefObject<MentionConfigs | undefined>;
  selectedItemsRef: RefObject<SelectedMentionItems>;
}

const ChatInputContext = createContext<ChatInputContextValue | null>(null);

function useChatInputContext() {
  const ctx = useContext(ChatInputContext);
  if (!ctx) {
    throw new Error("ChatInput components must be used within <ChatInput>");
  }
  return ctx;
}

function textToDoc(text: string): JSONContent {
  return {
    type: "doc",
    content: text.split("\n").map((line) => ({
      type: "paragraph",
      ...(line ? { content: [{ type: "text", text: line }] } : {}),
    })),
  };
}

type SharedChatInputProps = {
  status?: ChatStatus;
  onStop?: () => void;
  disabled?: boolean;
  defaultValue?: string;
  className?: string;
  children: ReactNode;
  /** Imperative handle (clear/focus/setText/insertText), not the DOM node. */
  ref?: Ref<ChatInputHandle>;
} & Omit<
  ComponentProps<"div">,
  "children" | "onSubmit" | "defaultValue" | "ref"
>;

type ChatInputPropsWithMentions<Items extends Record<string, BaseMentionItem>> =
  SharedChatInputProps & {
    mentions: { [K in keyof Items]: MentionConfig<Items[K]> };
    onSubmit: (
      parsed: ChatInputParsed<Items>,
      helpers: ChatInputHelpers
    ) => void;
    onParsedChange?: (parsed: ChatInputParsed<Items>) => void;
  };

type ChatInputPropsWithoutMentions = SharedChatInputProps & {
  mentions?: undefined;
  onSubmit: (parsed: { text: string }, helpers: ChatInputHelpers) => void;
  onParsedChange?: (parsed: { text: string }) => void;
};

export function ChatInput<Items extends Record<string, BaseMentionItem>>(
  props: ChatInputPropsWithMentions<Items>
): React.JSX.Element;
export function ChatInput(
  props: ChatInputPropsWithoutMentions
): React.JSX.Element;
export function ChatInput({
  mentions,
  onSubmit,
  onParsedChange,
  status,
  onStop,
  disabled = false,
  defaultValue,
  className,
  children,
  ref,
  ...props
}: SharedChatInputProps & {
  mentions?: MentionConfigs;
  // Runtime parse is untyped; overloads restore Items at the call site.
  // biome-ignore lint/suspicious/noExplicitAny: overload boundary
  onSubmit: (parsed: any, helpers: ChatInputHelpers) => void;
  // biome-ignore lint/suspicious/noExplicitAny: overload boundary
  onParsedChange?: (parsed: any) => void;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const mentionsRef = useRef(mentions);
  const onSubmitRef = useRef(onSubmit);
  const onParsedChangeRef = useRef(onParsedChange);
  const selectedItemsRef = useRef<SelectedMentionItems>({});

  mentionsRef.current = mentions;
  onSubmitRef.current = onSubmit;
  onParsedChangeRef.current = onParsedChange;

  const parse = useCallback(() => {
    if (!editor) {
      return { text: "" };
    }
    return parseEditorContent(
      editor.getJSON(),
      mentionsRef.current,
      selectedItemsRef.current
    );
  }, [editor]);

  const clear = useCallback(() => {
    editor?.commands.clearContent(true);
    selectedItemsRef.current = {};
  }, [editor]);

  const focus = useCallback(() => {
    editor?.commands.focus("end");
  }, [editor]);

  const submit = useCallback(() => {
    if (disabled) {
      return;
    }
    const parsed = parse();
    onSubmitRef.current(parsed, { clear, focus });
  }, [clear, disabled, focus, parse]);

  useImperativeHandle(
    ref,
    () => ({
      clear,
      focus,
      setText: (text) => {
        editor?.commands.setContent(textToDoc(text));
      },
      insertText: (text) => {
        editor?.chain().focus().insertContent(text).run();
      },
    }),
    [clear, editor, focus]
  );

  useEffect(() => {
    if (!(editor && onParsedChangeRef.current)) {
      return;
    }
    const handleUpdate = () => {
      onParsedChangeRef.current?.(parse());
    };
    editor.on("update", handleUpdate);
    handleUpdate();
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [editor, parse]);

  const contextValue = useMemo<ChatInputContextValue>(
    () => ({
      editor,
      setEditor,
      submit,
      status,
      onStop,
      disabled,
      defaultValue,
      mentions,
      mentionsRef,
      selectedItemsRef,
    }),
    [defaultValue, disabled, editor, mentions, onStop, status, submit]
  );

  return (
    <ChatInputContext.Provider value={contextValue}>
      <InputGroup className={cn("h-auto", className)} {...props}>
        {children}
      </InputGroup>
    </ChatInputContext.Provider>
  );
}

const SubmitEnter = Extension.create({
  name: "chatInputSubmitEnter",
  addOptions() {
    return {
      getOnEnter: (): (() => void) => () => undefined,
    };
  },
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        this.options.getOnEnter()?.();
        return true;
      },
    };
  },
});

export function ChatInputEditor({
  placeholder = "Type a message...",
  className,
  autoFocus,
}: {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const {
    setEditor,
    submit,
    disabled,
    defaultValue,
    mentions,
    mentionsRef,
    selectedItemsRef,
  } = useChatInputContext();

  const initialMentionsRef = useRef(mentions);
  const placeholderRef = useRef(placeholder);
  placeholderRef.current = placeholder;

  const onEnterRef = useRef(submit);
  onEnterRef.current = submit;

  // biome-ignore lint/correctness/useExhaustiveDependencies: editor built once; live config via refs
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        listItem: false,
        bulletList: false,
        orderedList: false,
      }),
      Placeholder.configure({
        placeholder: () => placeholderRef.current,
      }),
      SubmitEnter.configure({
        getOnEnter: () => onEnterRef.current,
      }),
      ...buildMentionExtensions(
        mentionsRef,
        selectedItemsRef,
        initialMentionsRef.current
      ),
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: defaultValue ?? "",
    editable: !disabled,
    autofocus: autoFocus ? "end" : false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "data-slot": "input-group-control",
        class: cn(
          "tiptap max-w-none flex-1 rounded-none border-0 bg-transparent py-2 shadow-none outline-none ring-0 focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent"
        ),
      },
    },
  });

  useLayoutEffect(() => {
    setEditor(editor);
    return () => setEditor(null);
  }, [editor, setEditor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  return (
    <EditorContent
      className={cn(
        "max-h-48 min-h-16 w-full flex-1 overflow-y-auto px-3 py-0",
        "[&_.tiptap]:outline-none",
        "[&_.tiptap_p.is-editor-empty:first-child]:before:pointer-events-none",
        "[&_.tiptap_p.is-editor-empty:first-child]:before:float-left",
        "[&_.tiptap_p.is-editor-empty:first-child]:before:h-0",
        "[&_.tiptap_p.is-editor-empty:first-child]:before:text-muted-foreground",
        "[&_.tiptap_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
        className
      )}
      editor={editor}
    />
  );
}

export function ChatInputSubmitButton({
  className,
  disabled,
  children,
  ...props
}: ComponentProps<typeof InputGroupButton>) {
  const {
    submit,
    status,
    onStop,
    disabled: contextDisabled,
  } = useChatInputContext();

  const isInFlight = status === "submitted" || status === "streaming";
  const actAsStop = isInFlight && onStop !== undefined;

  let icon = <ArrowUpIcon className="size-4" />;
  if (actAsStop) {
    icon = <SquareIcon className="size-4" />;
  } else if (isInFlight) {
    icon = <Loader2Icon className="size-4 animate-spin" />;
  } else if (status === "error") {
    icon = <XIcon className="size-4" />;
  }

  return (
    <InputGroupButton
      aria-label={actAsStop ? "Stop" : "Send"}
      className={className}
      disabled={(disabled ?? contextDisabled) || (isInFlight && !actAsStop)}
      onClick={(event) => {
        event.preventDefault();
        if (actAsStop) {
          onStop();
        } else {
          submit();
        }
      }}
      size="icon-sm"
      type="button"
      variant="default"
      {...props}
    >
      {children ?? icon}
      <span className="sr-only">{actAsStop ? "Stop" : "Send"}</span>
    </InputGroupButton>
  );
}

export function ChatInputMentionButton({
  trigger,
  className,
  children,
  ...props
}: ComponentProps<typeof InputGroupButton> & { trigger?: string }) {
  const { editor, mentions } = useChatInputContext();

  const configs = mentions ? Object.values(mentions) : [];
  const resolvedTrigger = trigger ?? configs[0]?.trigger;
  if (!resolvedTrigger) {
    return null;
  }

  return (
    <InputGroupButton
      aria-label={`Insert ${resolvedTrigger}`}
      className={cn("shrink-0", className)}
      onClick={() => {
        editor?.chain().focus().insertContent(resolvedTrigger).run();
      }}
      size="icon-sm"
      type="button"
      variant="outline"
      {...props}
    >
      {children ?? <AtSignIcon className="size-4" />}
      <span className="sr-only">Insert {resolvedTrigger}</span>
    </InputGroupButton>
  );
}
