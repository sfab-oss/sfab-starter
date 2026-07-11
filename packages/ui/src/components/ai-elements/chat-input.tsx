"use client";

import { Extension, mergeAttributes } from "@tiptap/core";
import { Mention as MentionExtension } from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import type { Editor, JSONContent } from "@tiptap/react";
import { EditorContent, ReactRenderer, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import {
  InputGroup,
  InputGroupButton,
} from "@workspace/ui/components/shadcn/input-group";
import { cn } from "@workspace/ui/lib/utils";
import type { ChatStatus } from "ai";
import {
  ArrowUpIcon,
  Loader2Icon,
  PlusIcon,
  SquareIcon,
  XIcon,
} from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface BaseMentionItem {
  id: string;
  name: string;
}

export interface MentionConfig<T extends BaseMentionItem> {
  trigger: string;
  items: T[] | ((query: string) => T[] | Promise<T[]>);
  render?: (item: T, selected: boolean) => ReactNode;
  chipClassName?: string;
}

// Mapped + intersection shape — cannot be an interface.
export type ChatInputParsed<Items extends Record<string, BaseMentionItem>> = {
  text: string;
} & { [K in keyof Items]?: Items[K][] };

interface ChatInputHelpers {
  clear: () => void;
  focus: () => void;
}

type MentionConfigs = Record<string, MentionConfig<BaseMentionItem>>;

interface ChatInputContextValue {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  submit: () => void;
  status?: ChatStatus;
  onStop?: () => void;
  disabled: boolean;
  defaultValue?: string;
  mentions: MentionConfigs | undefined;
  mentionsRef: React.MutableRefObject<MentionConfigs | undefined>;
  selectedItemsRef: React.MutableRefObject<
    Record<string, Map<string, BaseMentionItem>>
  >;
}

const ChatInputContext = createContext<ChatInputContextValue | null>(null);

function useChatInputContext() {
  const ctx = useContext(ChatInputContext);
  if (!ctx) {
    throw new Error("ChatInput components must be used within <ChatInput>");
  }
  return ctx;
}

type SharedChatInputProps = {
  status?: ChatStatus;
  onStop?: () => void;
  disabled?: boolean;
  defaultValue?: string;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<"div">, "children" | "onSubmit" | "defaultValue">;

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
  const selectedItemsRef = useRef<Record<string, Map<string, BaseMentionItem>>>(
    {}
  );

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

function filterStaticItems<T extends BaseMentionItem>(
  items: T[],
  query: string
): T[] {
  const q = query.toLowerCase();
  return items.filter((item) => item.name.toLowerCase().startsWith(q));
}

function resolveMentionItems<T extends BaseMentionItem>(
  config: MentionConfig<T>,
  query: string
): T[] | Promise<T[]> {
  if (typeof config.items === "function") {
    return config.items(query);
  }
  return filterStaticItems(config.items, query);
}

interface MentionListProps<T extends BaseMentionItem> {
  items: T[];
  loading?: boolean;
  command: (item: { id: string; label: string }) => void;
  renderItem?: (item: T, selected: boolean) => ReactNode;
  onSelectItem?: (item: T) => void;
  ref?: React.Ref<MentionListHandle>;
}

interface MentionListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

function MentionList<T extends BaseMentionItem>({
  items,
  loading,
  command,
  renderItem,
  onSelectItem,
  ref,
}: MentionListProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndexRef = useRef(0);
  selectedIndexRef.current = selectedIndex;

  useEffect(() => {
    setSelectedIndex(0);
    itemRefs.current = itemRefs.current.slice(0, items.length);
  }, [items]);

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];
      if (!item) {
        return;
      }
      onSelectItem?.(item);
      command({ id: item.id, label: item.name });
    },
    [command, items, onSelectItem]
  );

  const scrollToItem = useCallback((index: number) => {
    itemRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, []);

  const selectItemRef = useRef(selectItem);
  selectItemRef.current = selectItem;
  const itemsLengthRef = useRef(items.length);
  itemsLengthRef.current = items.length;

  useEffect(() => {
    if (!ref) {
      return;
    }
    const handle: MentionListHandle = {
      onKeyDown: ({ event }) => {
        const length = itemsLengthRef.current;
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => {
            const next = (prev + length - 1) % Math.max(length, 1);
            scrollToItem(next);
            return next;
          });
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => {
            const next = (prev + 1) % Math.max(length, 1);
            scrollToItem(next);
            return next;
          });
          return true;
        }
        if (event.key === "Enter") {
          selectItemRef.current(selectedIndexRef.current);
          return true;
        }
        return false;
      },
    };
    if (typeof ref === "function") {
      const assign = ref as (value: MentionListHandle | null) => void;
      assign(handle);
      return () => {
        assign(null);
      };
    }
    ref.current = handle;
    return () => {
      ref.current = null;
    };
  }, [ref, scrollToItem]);

  if (loading && items.length === 0) {
    return (
      <div className="min-w-48 rounded-lg border border-border bg-popover px-2 py-1.5 text-muted-foreground text-sm shadow-md">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex max-h-48 min-w-48 max-w-64 flex-col gap-1 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
      {items.length ? (
        items.map((item, index) => (
          <Button
            className={cn(
              "flex justify-start gap-2 px-1 py-2",
              selectedIndex === index && "bg-accent"
            )}
            key={item.id}
            onClick={() => selectItem(index)}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            {renderItem ? (
              renderItem(item, selectedIndex === index)
            ) : (
              <span className="px-2">{item.name}</span>
            )}
          </Button>
        ))
      ) : (
        <div className="px-2 py-1.5 text-muted-foreground text-sm">
          No results found
        </div>
      )}
    </div>
  );
}

function createMentionSuggestion(
  key: string,
  mentionsRef: React.MutableRefObject<MentionConfigs | undefined>,
  selectedItemsRef: React.MutableRefObject<
    Record<string, Map<string, BaseMentionItem>>
  >
) {
  return {
    items: ({ query }: { query: string }) => {
      const config = mentionsRef.current?.[key];
      if (!config) {
        return [];
      }
      return resolveMentionItems(config, query);
    },
    render: () => {
      let component: ReactRenderer<MentionListHandle> | null = null;
      let unmount: (() => void) | undefined;

      const rememberItem = (item: BaseMentionItem) => {
        if (!selectedItemsRef.current[key]) {
          selectedItemsRef.current[key] = new Map();
        }
        selectedItemsRef.current[key].set(item.id, item);
      };

      return {
        onStart: (props: SuggestionProps<BaseMentionItem>) => {
          const config = mentionsRef.current?.[key];
          component = new ReactRenderer(MentionList, {
            props: {
              items: props.items,
              loading: props.loading,
              command: props.command,
              renderItem: config?.render,
              onSelectItem: rememberItem,
            },
            editor: props.editor,
          });
          unmount = props.mount(component.element);
        },
        onUpdate: (props: SuggestionProps<BaseMentionItem>) => {
          const config = mentionsRef.current?.[key];
          component?.updateProps({
            items: props.items,
            loading: props.loading,
            command: props.command,
            renderItem: config?.render,
            onSelectItem: rememberItem,
          });
        },
        onKeyDown: (props: SuggestionKeyDownProps) => {
          if (props.event.key === "Escape") {
            unmount?.();
            unmount = undefined;
            return true;
          }
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          unmount?.();
          unmount = undefined;
          component?.destroy();
          component = null;
        },
      };
    },
  };
}

function buildMentionExtensions(
  keys: string[],
  mentionsRef: React.MutableRefObject<MentionConfigs | undefined>,
  selectedItemsRef: React.MutableRefObject<
    Record<string, Map<string, BaseMentionItem>>
  >,
  initialMentions: MentionConfigs | undefined
) {
  return keys.map((key) => {
    const initial = initialMentions?.[key];
    const MentionPlugin = MentionExtension.extend({
      name: `${key}-mention`,
      renderHTML({ node, HTMLAttributes }) {
        const chipClassName = mentionsRef.current?.[key]?.chipClassName;
        const trigger =
          mentionsRef.current?.[key]?.trigger ?? initial?.trigger ?? "@";
        return [
          "span",
          mergeAttributes(HTMLAttributes, {
            class: cn(
              "rounded-sm bg-primary px-1 py-0.5 text-primary-foreground no-underline",
              chipClassName
            ),
          }),
          `${trigger}${node.attrs.label ?? node.attrs.id}`,
        ];
      },
    });

    return MentionPlugin.configure({
      suggestion: {
        char: initial?.trigger ?? "@",
        ...createMentionSuggestion(key, mentionsRef, selectedItemsRef),
      },
    });
  });
}

function appendMentionFromNode(
  node: JSONContent,
  mentions: MentionConfigs | undefined,
  selectedItems: Record<string, Map<string, BaseMentionItem>>,
  buckets: Record<string, BaseMentionItem[]>
): string {
  const key = (node.type ?? "").slice(0, -"-mention".length);
  const config = mentions?.[key];
  const attrs = node.attrs ?? {};
  const id = String(attrs.id ?? "");
  const label = String(attrs.label ?? "");
  const trigger = config?.trigger ?? "";

  const cached = selectedItems[key]?.get(id);
  const item: BaseMentionItem = cached ?? { id, name: label };
  if (!buckets[key]) {
    buckets[key] = [];
  }
  if (!buckets[key].some((existing) => existing.id === id)) {
    buckets[key].push(item);
  }
  return `${trigger}${label}`;
}

function parseEditorContent(
  json: JSONContent,
  mentions: MentionConfigs | undefined,
  selectedItems: Record<string, Map<string, BaseMentionItem>>
) {
  let text = "";
  const buckets: Record<string, BaseMentionItem[]> = {};

  function recurse(node: JSONContent) {
    if (node.type === "text" && node.text) {
      text += node.text;
      return;
    }
    if (node.type === "hardBreak") {
      text += "\n";
      return;
    }
    if (node.type?.endsWith("-mention")) {
      text += appendMentionFromNode(node, mentions, selectedItems, buckets);
      return;
    }
    if (node.content) {
      for (const child of node.content) {
        recurse(child);
      }
      if (node.type === "paragraph") {
        text += "\n\n";
      }
    }
  }

  if (json.content) {
    for (const node of json.content) {
      recurse(node);
    }
  }

  return { text: text.trim(), ...buckets };
}

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

  const mentionKeysRef = useRef<string[] | null>(null);
  if (mentionKeysRef.current === null) {
    mentionKeysRef.current = mentions ? Object.keys(mentions) : [];
  }
  const mentionKeys = mentionKeysRef.current;
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
        placeholder: ({ editor: _editor }) => placeholderRef.current,
      }),
      SubmitEnter.configure({
        getOnEnter: () => onEnterRef.current,
      }),
      ...buildMentionExtensions(
        mentionKeys,
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
  ...props
}: ComponentProps<typeof InputGroupButton>) {
  const {
    submit,
    status,
    onStop,
    disabled: contextDisabled,
  } = useChatInputContext();

  const effectiveDisabled = disabled ?? contextDisabled;
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
      aria-label={actAsStop ? "Stop" : "Send"}
      className={className}
      disabled={effectiveDisabled && !actAsStop}
      onClick={
        actAsStop
          ? (event) => {
              event.preventDefault();
              onStop();
            }
          : (event) => {
              event.preventDefault();
              submit();
            }
      }
      size="icon-sm"
      type="button"
      variant="default"
      {...props}
    >
      {icon}
      <span className="sr-only">{actAsStop ? "Stop" : "Send"}</span>
    </InputGroupButton>
  );
}

export function ChatInputMentionButton({
  className,
  ...props
}: ComponentProps<typeof InputGroupButton>) {
  const { mentions, editor } = useChatInputContext();

  if (!mentions || Object.keys(mentions).length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <InputGroupButton
            aria-label="Insert mention"
            className={cn("shrink-0", className)}
            size="icon-sm"
            type="button"
            variant="outline"
            {...props}
          />
        }
      >
        <PlusIcon className="size-4" />
        <span className="sr-only">Insert mention</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48" side="top">
        {Object.entries(mentions).map(([key, config]) => (
          <DropdownMenuItem
            key={key}
            onClick={() => {
              if (editor) {
                editor.commands.insertContent(config.trigger);
                editor.commands.focus();
              }
            }}
          >
            {config.trigger} {key}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
