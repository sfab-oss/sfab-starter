"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import { Input } from "@workspace/ui/components/shadcn/input";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import {
  formatMajorInputValue,
  majorToMinor,
  minorToMajor,
} from "@workspace/ui/lib/money";
import { Trash2 } from "lucide-react";
import {
  bpsToPercent,
  percentToBps,
} from "@/components/documents/document-type";
import { useRemoveLineItem, useUpdateLineItem } from "@/hooks/use-documents";

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface LineItemRowProps {
  docId: string;
  currencyCode: string;
  line: LineItem;
}

export function LineItemRow({ docId, currencyCode, line }: LineItemRowProps) {
  const updateLineItem = useUpdateLineItem();
  const removeLineItem = useRemoveLineItem();

  return (
    <div className="grid grid-cols-1 gap-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_6rem] sm:items-end">
      <div className="grid gap-1">
        <span className="text-muted-foreground text-xs sm:hidden">
          Description
        </span>
        <Input
          aria-label="Description"
          defaultValue={line.description}
          onBlur={(e) => {
            const description = e.target.value.trim();
            if (!description) {
              e.target.value = line.description;
              toast.error("Description is required");
              return;
            }
            if (description !== line.description) {
              updateLineItem.mutate({
                id: docId,
                lineId: line.id,
                data: { description },
              });
            }
          }}
        />
      </div>
      <div className="grid gap-1">
        <span className="text-muted-foreground text-xs sm:hidden">Qty</span>
        <Input
          aria-label="Quantity"
          defaultValue={Math.abs(line.quantity)}
          min={1}
          onBlur={(e) => {
            const quantity = Math.abs(Number(e.target.value) || 0);
            if (quantity < 1) {
              e.target.value = String(Math.abs(line.quantity));
              toast.error("Quantity must be at least 1");
              return;
            }
            if (quantity !== Math.abs(line.quantity)) {
              updateLineItem.mutate({
                id: docId,
                lineId: line.id,
                data: { quantity },
              });
            }
          }}
          type="number"
        />
      </div>
      <div className="grid gap-1">
        <span className="text-muted-foreground text-xs sm:hidden">
          Unit price
        </span>
        <Input
          aria-label="Unit price"
          defaultValue={formatMajorInputValue(
            minorToMajor(line.unitPrice, currencyCode),
            currencyCode
          )}
          min={0}
          onBlur={(e) => {
            const raw = Number(e.target.value);
            if (!Number.isFinite(raw) || raw < 0) {
              e.target.value = String(
                formatMajorInputValue(
                  minorToMajor(line.unitPrice, currencyCode),
                  currencyCode
                )
              );
              toast.error("Unit price cannot be negative");
              return;
            }
            const unitPrice = majorToMinor(raw, currencyCode);
            if (unitPrice !== line.unitPrice) {
              updateLineItem.mutate({
                id: docId,
                lineId: line.id,
                data: { unitPrice },
              });
            }
          }}
          step="0.01"
          type="number"
        />
      </div>
      <div className="grid gap-1">
        <span className="text-muted-foreground text-xs sm:hidden">Tax %</span>
        <Input
          aria-label="Tax percent"
          defaultValue={bpsToPercent(line.taxRate)}
          min={0}
          onBlur={(e) => {
            const raw = Number(e.target.value);
            if (!Number.isFinite(raw) || raw < 0 || raw > 100) {
              e.target.value = String(bpsToPercent(line.taxRate));
              toast.error("Tax must be between 0 and 100");
              return;
            }
            const taxRate = percentToBps(raw);
            if (taxRate !== line.taxRate) {
              updateLineItem.mutate({
                id: docId,
                lineId: line.id,
                data: { taxRate },
              });
            }
          }}
          step="0.01"
          type="number"
        />
      </div>
      <Button
        aria-label="Remove line"
        className="w-full"
        onClick={() => removeLineItem.mutate({ id: docId, lineId: line.id })}
        size="icon"
        variant="ghost"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
