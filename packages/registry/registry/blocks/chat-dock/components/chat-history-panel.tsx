"use client";

import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";
import {
  CheckIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { groupChatsByAge, type MockChat } from "../lib/mock-chats";

/**
 * Chat history dropdown — a searchable, date-grouped list of past chats with
 * per-row rename and delete, mirroring the app's history surface. Selecting a
 * row opens it as a tab in the footer bar.
 */
export function ChatHistoryPanel({
  chats,
  onSelect,
  onRename,
  onDelete,
}: {
  chats: MockChat[];
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? chats.filter((chat) => chat.title.toLowerCase().includes(q))
      : chats;
    return groupChatsByAge(filtered);
  }, [chats, query]);

  const startEdit = (chat: MockChat) => {
    setEditingId(chat.id);
    setDraft(chat.title);
  };

  const commitEdit = () => {
    if (editingId) {
      onRename(editingId, draft);
    }
    setEditingId(null);
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center border-b px-3">
        <h2 className="truncate font-medium text-sm">Chat history</h2>
      </div>

      <div className="shrink-0 border-b px-2 py-2">
        <div className="flex h-9 items-center gap-2 rounded-full bg-muted px-3 text-muted-foreground focus-within:bg-muted/70">
          <SearchIcon className="size-3.5 shrink-0" />
          <input
            className="min-w-0 flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search chats..."
            type="search"
            value={query}
          />
        </div>
      </div>

      <div className="max-h-[min(420px,60svh)] min-h-0 overflow-y-auto py-1.5">
        {sections.length === 0 ? (
          <p className="px-3 py-6 text-center text-muted-foreground text-sm">
            No chats found.
          </p>
        ) : (
          sections.map((section) => (
            <div className="px-1.5 pb-1" key={section.label}>
              <p className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
                {section.label}
              </p>
              {section.chats.map((chat) => (
                <HistoryRow
                  chat={chat}
                  draft={draft}
                  isEditing={editingId === chat.id}
                  key={chat.id}
                  onCancelEdit={() => setEditingId(null)}
                  onCommitEdit={commitEdit}
                  onDelete={() => onDelete(chat.id)}
                  onDraftChange={setDraft}
                  onSelect={() => onSelect(chat.id)}
                  onStartEdit={() => startEdit(chat)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HistoryRow({
  chat,
  isEditing,
  draft,
  onSelect,
  onStartEdit,
  onDelete,
  onDraftChange,
  onCommitEdit,
  onCancelEdit,
}: {
  chat: MockChat;
  isEditing: boolean;
  draft: string;
  onSelect: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onDraftChange: (value: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
}) {
  const isMobile = useIsMobile();

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 rounded-md px-2 py-1">
        <input
          autoFocus
          className="min-w-0 flex-1 rounded-sm border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCommitEdit();
            }
            if (event.key === "Escape") {
              onCancelEdit();
            }
          }}
          value={draft}
        />
        <RowIconButton
          icon={CheckIcon}
          label="Save title"
          onClick={onCommitEdit}
        />
        <RowIconButton
          icon={XIcon}
          label="Cancel rename"
          onClick={onCancelEdit}
        />
      </div>
    );
  }

  // On touch there is no hover, so the rename/delete actions are always shown
  // (and the relative age label steps aside for them).
  return (
    <div className="group/row flex items-center rounded-md focus-within:bg-muted hover:bg-muted">
      <button
        className={cn(
          "min-w-0 flex-1 px-2 text-left outline-none",
          isMobile ? "min-h-11 py-2.5" : "py-2"
        )}
        onClick={onSelect}
        type="button"
      >
        <span className="block truncate text-sm">{chat.title}</span>
      </button>
      <div
        className={cn(
          "relative mr-1.5 flex shrink-0 items-center justify-end",
          isMobile ? "h-11" : "h-7 w-16"
        )}
      >
        {isMobile ? null : (
          <span className="text-muted-foreground text-xs tabular-nums transition-opacity group-hover/row:opacity-0">
            {chat.ageLabel}
          </span>
        )}
        <div
          className={cn(
            "flex items-center gap-0.5",
            isMobile
              ? "opacity-100"
              : "absolute inset-y-0 right-0 opacity-0 transition-opacity group-hover/row:opacity-100"
          )}
        >
          <RowIconButton
            icon={PencilIcon}
            label={`Rename ${chat.title}`}
            large={isMobile}
            onClick={onStartEdit}
          />
          <RowIconButton
            destructive
            icon={Trash2Icon}
            label={`Delete ${chat.title}`}
            large={isMobile}
            onClick={onDelete}
          />
        </div>
      </div>
    </div>
  );
}

function RowIconButton({
  icon: Icon,
  label,
  onClick,
  destructive = false,
  large = false,
}: {
  icon: typeof PencilIcon;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  large?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background",
        large ? "size-9" : "size-6",
        destructive ? "hover:text-destructive" : "hover:text-foreground"
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className={large ? "size-4" : "size-3.5"} />
    </button>
  );
}
