import type { SearchResult } from "@workspace/types/search";
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
import { CornerDownLeft, Loader2, Package, Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useSearch } from "@/hooks/query/use-search";

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

  const { data, isLoading } = useSearch(debouncedQuery);
  const results = data?.results || [];

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const result of results) {
      const groupName =
        result.metadata.type === "product" ? "Products" : "Warehouses";

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(result);
    }
    return groups;
  }, [results]);

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
      const meta = result.metadata;

      // Type-Safe Routing based on Discriminator
      switch (meta.type) {
        case "product":
          router.push(`/inventory/${meta.id}`);
          break;

        case "warehouse":
          router.push(`/inventory/warehouses/${meta.id}`);
          break;
        default:
          break;
      }
    },
    [router, setOpen]
  );

  return (
    <CommandDialog onOpenChange={setOpen} open={open}>
      <DialogTitle className="sr-only">Global Search</DialogTitle>
      <DialogDescription className="sr-only">
        Search across products and warehouses
      </DialogDescription>

      <div className="flex items-center border-b px-3">
        <CommandInput
          className="border-none focus:ring-0"
          onValueChange={setQuery}
          placeholder="Search products and warehouses..."
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

        {results.length > 0 &&
          Object.entries(groupedResults).map(([groupName, groupItems]) => (
            <CommandGroup heading={groupName} key={groupName}>
              {groupItems.map((result) => (
                <ResultItem
                  key={result.path + result.metadata.id}
                  onSelect={handleSelect}
                  result={result}
                />
              ))}
            </CommandGroup>
          ))}
      </CommandList>

      {/* Footer */}
      <div className="flex h-10 items-center justify-between border-t bg-muted/20 px-3 text-muted-foreground text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <CornerDownLeft className="h-3 w-3" /> Open
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>Search powered by PostgreSQL</span>
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
  const meta = result.metadata;

  // Visual Configuration based on type
  const getConfig = () => {
    switch (meta.type) {
      case "product":
        return {
          icon: Package,
          badgeColor:
            "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
          label: "Product",
        };
      case "warehouse":
        return {
          icon: Warehouse,
          badgeColor:
            "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
          label: "Warehouse",
        };
      default:
        return {
          icon: Package,
          badgeColor:
            "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
          label: "Unknown",
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <CommandItem
      className="flex items-start gap-3 rounded-lg px-3 py-3 aria-selected:bg-accent"
      onSelect={() => onSelect(result)}
      value={result.metadata.title + result.snippet}
    >
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <span className="flex-1 truncate font-medium">
            {result.metadata.title}
          </span>
          <Badge
            className={`h-5 px-2 font-medium text-[10px] ${config.badgeColor}`}
            variant="outline"
          >
            {config.label}
          </Badge>
        </div>

        <p className="line-clamp-2 text-muted-foreground text-sm">
          {result.snippet}
        </p>

        <div className="flex items-center gap-2 text-muted-foreground/70 text-xs">
          <span className="max-w-[200px] truncate font-mono">
            {result.path}
          </span>
          {meta.type === "product" && (
            <>
              <span>•</span>
              <span>SKU: {meta.sku}</span>
            </>
          )}
        </div>
      </div>
    </CommandItem>
  );
}
