"use client";

import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/shadcn/command";
import {
  COMMAND_PALETTE_NAVIGATION,
  type NavigationItem,
} from "@workspace/ui/lib/navigation-config";
import type { LucideIcon } from "lucide-react";
import { CornerDownLeft } from "lucide-react";
import type { ReactNode } from "react";

export interface CommandPaletteAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect?: () => void;
}

export interface CommandPaletteSearchItem {
  id: string;
  title: string;
  subtitle?: string;
  path?: string;
  /** Badge label — e.g. Person, Product, Invoice. */
  type: string;
  icon?: LucideIcon;
  keywords?: string[];
}

export interface CommandPaletteSearchGroup {
  heading: string;
  items: CommandPaletteSearchItem[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigation?: NavigationItem[];
  actions?: CommandPaletteAction[];
  onNavigate?: (path: string) => void;
  /**
   * The stateful body rendered below the static "Go to" navigation — compose
   * `CommandPaletteResults`, a `CommandPaletteStatus`, or nothing. The frame owns
   * the invariant chrome (dialog, input, nav, footer); the caller owns the state
   * branch.
   */
  children?: ReactNode;
}

function searchItemValue(item: CommandPaletteSearchItem) {
  return [
    item.title,
    item.subtitle,
    item.path,
    item.type,
    item.keywords?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function CommandPaletteSearchRow({ item }: { item: CommandPaletteSearchItem }) {
  const Icon = item.icon;

  return (
    <div className="flex min-w-0 flex-1 items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
        {Icon ? <Icon className="size-4" /> : null}
      </div>
      <div className="min-w-0 flex-1 gap-0.5 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{item.title}</span>
          <Badge
            className="h-5 shrink-0 px-2 font-medium text-[10px]"
            variant="outline"
          >
            {item.type}
          </Badge>
        </div>
        {(item.subtitle || item.path) && (
          <p className="truncate text-muted-foreground/80 text-xs">
            {item.subtitle}
            {item.subtitle && item.path ? " · " : null}
            {item.path ? <span className="font-mono">{item.path}</span> : null}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * A remote-state row for the palette body (searching / error). Compose it as a
 * child of `CommandPalette` in place of `CommandPaletteResults`.
 */
export function CommandPaletteStatus({
  tone = "default",
  children,
}: {
  tone?: "default" | "error";
  children: ReactNode;
}) {
  if (tone === "error") {
    return (
      <div
        className="px-4 py-6 text-center text-destructive text-sm"
        role="alert"
      >
        {children}
      </div>
    );
  }

  // `<output>` carries an implicit `status` live region — no explicit role.
  return (
    <output className="block px-4 py-6 text-center text-muted-foreground text-sm">
      {children}
    </output>
  );
}

/**
 * The grouped remote search results. Compose it as a child of `CommandPalette`;
 * renders nothing when there are no matching items.
 */
export function CommandPaletteResults({
  groups,
  onSelect,
}: {
  groups: CommandPaletteSearchGroup[];
  onSelect?: (item: CommandPaletteSearchItem) => void;
}) {
  const hasItems = groups.some((group) => group.items.length > 0);

  if (!hasItems) {
    return null;
  }

  return (
    <>
      <CommandSeparator />
      {groups.map((group) =>
        group.items.length > 0 ? (
          <CommandGroup heading={group.heading} key={group.heading}>
            {group.items.map((item) => (
              <CommandItem
                className="items-start py-2.5"
                key={item.id}
                onSelect={() => onSelect?.(item)}
                value={searchItemValue(item)}
              >
                <CommandPaletteSearchRow item={item} />
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null
      )}
    </>
  );
}

export function CommandPalette({
  open,
  onOpenChange,
  navigation = COMMAND_PALETTE_NAVIGATION,
  actions = [],
  onNavigate,
  children,
}: CommandPaletteProps) {
  const hasActions = actions.length > 0;

  return (
    <CommandDialog
      description="Go to a page, run an action, or open a record"
      onOpenChange={onOpenChange}
      open={open}
      title="Command palette"
    >
      <CommandInput placeholder="Search pages, people, products, invoices…" />
      <CommandList className="max-h-[min(28rem,60vh)]">
        <CommandEmpty>No results.</CommandEmpty>
        {hasActions ? (
          <CommandGroup heading="Actions">
            {actions.map((action) => (
              <CommandItem
                key={action.id}
                onSelect={() => {
                  action.onSelect?.();
                  onOpenChange(false);
                }}
              >
                {action.icon}
                <span>{action.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {hasActions ? <CommandSeparator /> : null}
        <CommandGroup heading="Go to">
          {navigation.map((item) => (
            <CommandItem
              key={item.id}
              onSelect={() => {
                onNavigate?.(item.path);
                onOpenChange(false);
              }}
              value={`${item.label} ${item.path} Page`}
            >
              <item.icon className="size-4 text-muted-foreground" />
              <span>{item.label}</span>
              {item.comingSoon ? (
                <span className="ml-auto text-muted-foreground text-xs">
                  Coming soon
                </span>
              ) : null}
            </CommandItem>
          ))}
        </CommandGroup>
        {children}
      </CommandList>
      <div className="flex h-10 items-center justify-between border-t bg-muted/20 px-3 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <CornerDownLeft className="size-3" />
          Select
        </div>
        <span>⌘K to open</span>
      </div>
    </CommandDialog>
  );
}
