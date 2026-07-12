"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/shadcn/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/shadcn/popover";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronsUpDown, UserRound } from "lucide-react";
import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { type Entity, useEntities } from "@/hooks/use-entities";
import { m } from "@/paraglide/messages.js";

export type EntityPickerValue =
  | {
      kind: "entity";
      entity: Pick<Entity, "id" | "name" | "type">;
    }
  | {
      kind: "walk_in";
      name: string;
    }
  | null;

function entityTypeLabel(type: string): string {
  switch (type) {
    case "customer":
      return m.entities_type_customer();
    case "supplier":
      return m.entities_type_supplier();
    case "walk_in":
      return m.documents_walk_in();
    default:
      return type.replaceAll("_", " ");
  }
}

interface EntityPickerProps {
  value: EntityPickerValue;
  onChange: (value: EntityPickerValue) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function EntityPicker({
  value,
  onChange,
  disabled,
  placeholder = m.entities_select(),
  className,
}: EntityPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debouncedSetSearch = useDebouncedCallback((next: string) => {
    setDebouncedSearch(next);
  }, 200);
  const { data, isLoading } = useEntities({
    page: 1,
    pageSize: 20,
    sortOrder: "asc",
    sortBy: "name",
    search: debouncedSearch || undefined,
  });
  let label = placeholder;
  if (value?.kind === "entity") {
    label = value.entity.name;
  } else if (value?.kind === "walk_in") {
    label = value.name;
  }
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", className)}
            disabled={disabled}
            role="combobox"
            variant="outline"
          />
        }
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <UserRound className="size-4 shrink-0 text-muted-foreground" />
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {label}
          </span>
        </span>
        <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] gap-0 p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={(next) => {
              setSearch(next);
              debouncedSetSearch(next);
            }}
            placeholder={m.entities_search_placeholder()}
            value={search}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? m.common_loading() : m.entities_empty()}
            </CommandEmpty>
            <CommandGroup heading={m.entities_adhoc()}>
              <CommandItem
                onSelect={() => {
                  onChange({
                    kind: "walk_in",
                    name: search.trim() || m.documents_walk_in(),
                  });
                  setOpen(false);
                }}
                value="walk-in"
              >
                <Check
                  className={cn(
                    "mr-2 size-4",
                    value?.kind === "walk_in" ? "opacity-100" : "opacity-0"
                  )}
                />
                {m.documents_walk_in()}
                {search.trim() ? (
                  <span className="ml-1 text-muted-foreground">
                    “{search.trim()}”
                  </span>
                ) : null}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading={m.entities_title()}>
              {(data?.data ?? []).map((entity) => (
                <CommandItem
                  key={entity.id}
                  onSelect={() => {
                    onChange({
                      kind: "entity",
                      entity: {
                        id: entity.id,
                        name: entity.name,
                        type: entity.type,
                      },
                    });
                    setOpen(false);
                  }}
                  value={entity.id}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value?.kind === "entity" && value.entity.id === entity.id
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{entity.name}</span>
                  <span className="text-muted-foreground text-xs capitalize">
                    {entityTypeLabel(entity.type)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
