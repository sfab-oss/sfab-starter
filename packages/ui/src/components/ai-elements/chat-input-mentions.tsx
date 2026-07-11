"use client";

import { mergeAttributes } from "@tiptap/core";
import { Mention as MentionExtension } from "@tiptap/extension-mention";
import type { JSONContent } from "@tiptap/react";
import { ReactRenderer } from "@tiptap/react";
import type {
  SuggestionKeyDownProps,
  SuggestionProps,
} from "@tiptap/suggestion";
import { cn } from "@workspace/ui/lib/utils";
import {
  type ReactNode,
  type RefObject,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface BaseMentionItem {
  id: string;
  name: string;
}

export interface MentionConfig<T extends BaseMentionItem> {
  /** Fixed at mount — changing it later has no effect. */
  trigger: string;
  items: T[] | ((query: string) => T[] | Promise<T[]>);
  render?: (item: T, selected: boolean) => ReactNode;
  chipClassName?: string;
}

export type MentionConfigs = Record<string, MentionConfig<BaseMentionItem>>;

export type SelectedMentionItems = Record<string, Map<string, BaseMentionItem>>;

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

interface MentionListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface MentionListProps<T extends BaseMentionItem> {
  items: T[];
  loading?: boolean;
  command: (item: { id: string; label: string }) => void;
  renderItem?: (item: T, selected: boolean) => ReactNode;
  onSelectItem?: (item: T) => void;
  ref?: React.Ref<MentionListHandle>;
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
  const [prevItems, setPrevItems] = useState(items);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  if (prevItems !== items) {
    setPrevItems(items);
    setSelectedIndex(0);
  }

  const selectItem = (index: number) => {
    const item = items[index];
    if (!item) {
      return;
    }
    onSelectItem?.(item);
    command({ id: item.id, label: item.name });
  };

  const moveSelection = (delta: number) => {
    setSelectedIndex((prev) => {
      const length = Math.max(items.length, 1);
      const next = (prev + delta + length) % length;
      itemRefs.current[next]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      return next;
    });
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === "ArrowUp") {
        moveSelection(-1);
        return true;
      }
      if (event.key === "ArrowDown") {
        moveSelection(1);
        return true;
      }
      if (event.key === "Enter") {
        selectItem(selectedIndex);
        return true;
      }
      return false;
    },
  }));

  if (loading && items.length === 0) {
    return (
      <div className="min-w-48 rounded-md bg-popover px-2 py-1.5 text-muted-foreground text-sm shadow-md ring-1 ring-foreground/10">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex max-h-48 min-w-48 max-w-64 flex-col overflow-y-auto overflow-x-hidden rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
      {items.length ? (
        items.map((item, index) => (
          <button
            className={cn(
              "relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
              selectedIndex === index && "bg-accent text-accent-foreground"
            )}
            key={item.id}
            onClick={() => selectItem(index)}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            type="button"
          >
            {renderItem ? (
              renderItem(item, selectedIndex === index)
            ) : (
              <span className="truncate">{item.name}</span>
            )}
          </button>
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
  mentionsRef: RefObject<MentionConfigs | undefined>,
  selectedItemsRef: RefObject<SelectedMentionItems>
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
          // The mount wrapper is the positioned element (appended to body,
          // position:absolute, no z-index) — without this it stacks below
          // elevated surfaces like the z-50 chat dock.
          component.element.style.zIndex = "50";
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

export function buildMentionExtensions(
  mentionsRef: RefObject<MentionConfigs | undefined>,
  selectedItemsRef: RefObject<SelectedMentionItems>,
  initialMentions: MentionConfigs | undefined
) {
  return Object.entries(initialMentions ?? {}).map(([key, config]) => {
    const trigger = config.trigger || "@";
    const MentionPlugin = MentionExtension.extend({
      name: `${key}-mention`,
      renderHTML({ node, HTMLAttributes }) {
        const chipClassName = mentionsRef.current?.[key]?.chipClassName;
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
        char: trigger,
        ...createMentionSuggestion(key, mentionsRef, selectedItemsRef),
      },
    });
  });
}

function appendMentionFromNode(
  node: JSONContent,
  mentions: MentionConfigs | undefined,
  selectedItems: SelectedMentionItems,
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

export function parseEditorContent(
  json: JSONContent,
  mentions: MentionConfigs | undefined,
  selectedItems: SelectedMentionItems
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
