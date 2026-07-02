"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/shadcn/alert";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/shadcn/empty";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { AlertCircle, FilterX, RefreshCw, UserPlus, Users } from "lucide-react";

const SKELETON_ROW_IDS = [
  "row-a",
  "row-b",
  "row-c",
  "row-d",
  "row-e",
  "row-f",
  "row-g",
  "row-h",
] as const;

export function ResourceListTableSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex min-h-0 flex-1 flex-col"
      data-slot="resource-list-skeleton"
    >
      <output className="sr-only">Loading people…</output>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="ml-auto h-8 w-28" />
      </div>
      <div className="min-h-0 flex-1 space-y-0 px-4 py-2">
        <Skeleton className="mb-2 h-9 w-full" />
        {SKELETON_ROW_IDS.map((rowId) => (
          <Skeleton className="mb-2 h-11 w-full" key={rowId} />
        ))}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-7" />
        <Skeleton className="size-7" />
      </div>
    </div>
  );
}

export function ResourceListStaleBanner() {
  return (
    <Alert
      className="mb-3 shrink-0 border-dashed py-2"
      data-slot="resource-list-stale"
    >
      <RefreshCw className="animate-spin" />
      <AlertTitle>Updating results</AlertTitle>
      <AlertDescription>
        Showing the previous page while new data loads.
      </AlertDescription>
    </Alert>
  );
}

export function ResourceListErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <Empty
      className="min-h-[min(420px,60vh)] flex-1 border-dashed"
      data-slot="resource-list-error"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <AlertCircle />
        </EmptyMedia>
        <EmptyTitle>Could not load this list</EmptyTitle>
        <EmptyDescription>
          {message ??
            "Something went wrong while fetching records. Try again in a moment."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onRetry} type="button" variant="outline">
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function ResourceListEmptyState({
  onCreate,
}: {
  onCreate?: () => void;
}) {
  return (
    <Empty
      className="min-h-[min(360px,50vh)] flex-1 border-0"
      data-slot="resource-list-empty"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Users />
        </EmptyMedia>
        <EmptyTitle>No people yet</EmptyTitle>
        <EmptyDescription>
          Add customers and suppliers to track contacts, balances, and activity
          in one place.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onCreate} type="button">
          <UserPlus className="size-4" />
          New person
        </Button>
      </EmptyContent>
    </Empty>
  );
}

export function ResourceListPresetEmptyState({
  onClearFilters,
}: {
  onClearFilters: () => void;
}) {
  return (
    <Empty
      className="min-h-[min(360px,50vh)] flex-1 border-0"
      data-slot="resource-list-preset-empty"
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FilterX />
        </EmptyMedia>
        <EmptyTitle>No matches for these filters</EmptyTitle>
        <EmptyDescription>
          Try clearing filters or broadening your search to see more records.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={onClearFilters} type="button" variant="outline">
          Clear filters
        </Button>
      </EmptyContent>
    </Empty>
  );
}
