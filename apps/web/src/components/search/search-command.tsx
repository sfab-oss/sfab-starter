"use client";

import { useRouter } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/shadcn/command";
import {
  DialogDescription,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import {
  CornerDownLeft,
  Home,
  Loader2,
  Package,
  Settings,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

interface SearchResult {
  id: string;
  title: string;
  path: string;
  icon: typeof Home;
}

const availablePages: SearchResult[] = [
  {
    id: "home",
    title: "Home",
    path: "/",
    icon: Home,
  },
  {
    id: "inventory",
    title: "Inventory",
    path: "/inventory",
    icon: Package,
  },
  {
    id: "warehouses",
    title: "Warehouses",
    path: "/inventory/warehouses",
    icon: Warehouse,
  },
  {
    id: "settings",
    title: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

interface SearchCommandProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function SearchCommand({ open, setOpen }: SearchCommandProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const debouncedSetQuery = useDebouncedCallback((value: string) => {
    setDebouncedQuery(value);
  }, 300);

  const isLoading = false;

  const filteredResults = availablePages.filter(
    (page) =>
      page.title.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      page.path.toLowerCase().includes(debouncedQuery.toLowerCase())
  );

  useEffect(() => {
    debouncedSetQuery(query);
  }, [query, debouncedSetQuery]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return;
        }

        e.preventDefault();
        setOpen(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, setOpen]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false);
      router.navigate({ to: result.path });
    },
    [router, setOpen]
  );

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <DialogTitle className="sr-only">Global Search</DialogTitle>
      <DialogDescription className="sr-only">
        Search across pages
      </DialogDescription>

      <div className="flex items-center border-b px-3">
        <CommandInput
          className="border-none focus:ring-0"
          onValueChange={setQuery}
          placeholder="Search pages..."
          value={query}
        />
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      <CommandList className="max-h-[500px] pb-2">
        <CommandEmpty className="py-6 text-center text-muted-foreground text-sm">
          {query.length === 0 ? "Type to search..." : "No results found."}
        </CommandEmpty>

        {filteredResults.length > 0 && (
          <CommandGroup heading="Pages">
            {filteredResults.map((result) => (
              <ResultItem
                key={result.id}
                onSelect={handleSelect}
                result={result}
              />
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="flex h-10 items-center justify-between border-t bg-muted/20 px-3 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" /> Open
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Cmd+K to open</span>
        </div>
      </div>
    </CommandDialog>
  );
}

function ResultItem({
  result,
  onSelect,
}: {
  result: SearchResult;
  onSelect: (r: SearchResult) => void;
}) {
  const Icon = result.icon;

  return (
    <CommandItem
      className="flex items-start gap-3 rounded-lg px-3 py-3 aria-selected:bg-accent"
      onSelect={() => onSelect(result)}
      value={result.title + result.path}
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate font-medium">{result.title}</span>
          <Badge className="h-5 px-2 font-medium text-[10px]" variant="outline">
            Page
          </Badge>
        </div>

        <div className="flex items-center gap-2 text-muted-foreground/70 text-xs">
          <span className="max-w-[200px] truncate font-mono">
            {result.path}
          </span>
        </div>
      </div>
    </CommandItem>
  );
}
