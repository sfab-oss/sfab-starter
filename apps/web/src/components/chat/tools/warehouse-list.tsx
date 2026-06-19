"use client";

import { Link } from "@tanstack/react-router";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { memo } from "react";
import { useWarehouse } from "@/hooks/use-warehouses";
import type { ToolRenderProps } from "./tool-registry";

interface DisplayWarehouseListOutput {
  warehouseIds?: string[];
}

function WarehouseRow({ warehouseId }: { warehouseId: string }) {
  const { data: warehouse, isLoading, isError } = useWarehouse(warehouseId);

  if (isLoading) {
    return (
      <div className="flex min-w-0 items-center gap-2 px-3 py-2">
        <Skeleton className="h-4 min-w-0 flex-1" />
        <Skeleton className="h-4 w-24 shrink-0" />
      </div>
    );
  }

  if (isError || !warehouse) {
    return (
      <div className="px-3 py-2 text-muted-foreground text-sm">
        Warehouse not found ({warehouseId})
      </div>
    );
  }

  return (
    <Link
      className="flex min-w-0 items-center gap-2 px-3 py-2 hover:bg-muted/50"
      params={{ id: warehouse.id }}
      to="/inventory/warehouses/$id"
    >
      <span className="min-w-0 flex-1 truncate font-medium">
        {warehouse.name}
      </span>
      {warehouse.location ? (
        <span className="shrink-0 truncate text-muted-foreground text-xs">
          {warehouse.location}
        </span>
      ) : null}
      {warehouse.isDefault ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          Default
        </span>
      ) : null}
    </Link>
  );
}

export const WarehouseListDisplay = memo(({ part }: ToolRenderProps) => {
  const output = part.output as DisplayWarehouseListOutput | undefined;
  const warehouseIds = output?.warehouseIds ?? [];

  if (warehouseIds.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No warehouses to display.</p>
    );
  }

  return (
    <div className="divide-y rounded-md border bg-card text-sm">
      {warehouseIds.map((warehouseId) => (
        <WarehouseRow key={warehouseId} warehouseId={warehouseId} />
      ))}
    </div>
  );
});

WarehouseListDisplay.displayName = "WarehouseListDisplay";
