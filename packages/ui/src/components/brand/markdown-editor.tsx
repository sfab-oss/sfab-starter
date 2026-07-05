"use client";

import {
  BasicTextStyleButton,
  BlockTypeSelect,
  CreateLinkButton,
  FormattingToolbar,
  FormattingToolbarController,
  useCreateBlockNote,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import { cn } from "@workspace/ui/lib/utils";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import "./markdown-editor.css";

export interface MarkdownEditorProps {
  /** Document content as a markdown string (controlled). */
  value: string;
  /** Called with the serialized markdown on every edit. */
  onChange?: (markdown: string) => void;
  /** Render read-only — no editing, no toolbar. */
  readOnly?: boolean;
  /** Extra classes on the editor root. */
  className?: string;
}

/**
 * BlockNote-based WYSIWYG markdown editor (shadcn variant). Content is a markdown
 * string end-to-end — parsed to blocks on load, serialized back with
 * `blocksToMarkdownLossy` on edit — so it drops into any text/`content` field
 * without a schema migration.
 *
 * Controlled: the parent owns `value`; the component emits `onChange(markdown)`
 * and re-seeds only when `value` changes *externally* (not from its own edit), so
 * typing never resets the cursor. Persistence (debounce, autosave, mutations) is
 * the consumer's job.
 *
 * Layout-neutral: it makes no width/centering assumptions — wrap it in your own
 * column (e.g. `max-w-3xl`). Client-only (BlockNote needs a browser); mount it
 * behind a client boundary such as TanStack's `<ClientOnly>`.
 */
export function MarkdownEditor({
  value,
  onChange,
  readOnly,
  className,
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();
  const [isReady, setIsReady] = useState(false);
  const editor = useCreateBlockNote();

  // The markdown the editor currently reflects: `null` before the first seed (so
  // the mount pass always runs), then the last value we parsed in or emitted.
  // Comparing against it suppresses the echo of our own onChange, so an outside
  // `value` change re-seeds the doc while typing never resets the cursor.
  const reflectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (reflectedRef.current === value) {
      return;
    }
    const isInitialSeed = reflectedRef.current === null;
    reflectedRef.current = value;
    // Skip an empty *initial* doc (BlockNote already starts with one empty
    // paragraph); an external change to "" still clears the content.
    if (value || !isInitialSeed) {
      editor.replaceBlocks(
        editor.document,
        editor.tryParseMarkdownToBlocks(value)
      );
    }
    setIsReady(true);
  }, [value, editor]);

  const handleChange = () => {
    if (!isReady || readOnly) {
      return;
    }
    const markdown = editor.blocksToMarkdownLossy(editor.document);
    reflectedRef.current = markdown;
    onChange?.(markdown);
  };

  if (!isReady) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "min-h-32 animate-pulse rounded-md bg-muted/40",
          className
        )}
      />
    );
  }

  return (
    <BlockNoteView
      className={cn(className)}
      editable={!readOnly}
      editor={editor}
      formattingToolbar={false}
      onChange={handleChange}
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    >
      <FormattingToolbarController
        formattingToolbar={() => (
          <FormattingToolbar>
            <BlockTypeSelect key="blockTypeSelect" />
            <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
            <BasicTextStyleButton
              basicTextStyle="italic"
              key="italicStyleButton"
            />
            <BasicTextStyleButton
              basicTextStyle="strike"
              key="strikeStyleButton"
            />
            <BasicTextStyleButton basicTextStyle="code" key="codeStyleButton" />
            <CreateLinkButton key="createLinkButton" />
          </FormattingToolbar>
        )}
      />
    </BlockNoteView>
  );
}
