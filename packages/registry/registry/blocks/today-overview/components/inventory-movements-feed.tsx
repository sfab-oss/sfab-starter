"use client";

import { cn } from "@workspace/ui/lib/utils";
import type { InventoryMovementRow } from "../lib/mock-inventory-movements";
import { INVENTORY_MOVEMENTS_FEED_LIMIT } from "../lib/mock-inventory-movements";

function formatMovementAt(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) {
    return at;
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function formatQuantityDelta(delta: number): string {
  if (delta > 0) {
    return `+${delta}`;
  }
  return String(delta);
}

export function InventoryMovementsFeed({
  movements,
  limit = INVENTORY_MOVEMENTS_FEED_LIMIT,
  className,
  ...props
}: React.ComponentProps<"section"> & {
  movements: InventoryMovementRow[];
  limit?: number;
}) {
  const rows = movements.slice(0, limit);

  return (
    <section
      className={cn("space-y-2", className)}
      data-slot="inventory-movements-feed"
      {...props}
    >
      <div className="space-y-1">
        <h2 className="font-medium text-sm">Inventory movements</h2>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Manual stock adjustments — interim feed from inventory, not document
          activity.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-muted-foreground text-xs">
              <th className="px-3 py-2 text-left font-normal">Product</th>
              <th className="px-3 py-2 text-left font-normal">Warehouse</th>
              <th className="px-3 py-2 text-left font-normal">Change</th>
              <th className="px-3 py-2 text-left font-normal">When</th>
              <th className="px-3 py-2 text-left font-normal">By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t" key={row.id}>
                <td className="px-3 py-2">{row.productName}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {row.warehouse}
                </td>
                <td className="px-3 py-2 font-medium tabular-nums">
                  {formatQuantityDelta(row.quantityDelta)}
                </td>
                <td className="px-3 py-2 text-muted-foreground tabular-nums">
                  {formatMovementAt(row.at)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{row.actor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
