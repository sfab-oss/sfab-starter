"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@workspace/ui/components/brand/sortable-header";
import { formatMoneyMinor } from "@workspace/ui/lib/money";
import {
  enumOptionsFromValues,
  type TableFilterDefinition,
} from "@workspace/ui/lib/table-filter-types";
import { PaymentStatusBadge } from "./payment-status-badge";
import { GALLERY_CURRENCY_CODE, type OpenInvoiceRow } from "./payment-types";

export const OPEN_INVOICE_FILTER_DEFINITIONS: TableFilterDefinition[] = [
  {
    id: "client",
    columnId: "client",
    label: "Customer",
    type: "text",
    placeholder: "Search customers…",
  },
  {
    id: "paymentStatus",
    columnId: "paymentStatus",
    label: "Payment",
    type: "enum",
    options: enumOptionsFromValues(["unpaid", "partial", "paid"]),
  },
];

export const OPEN_INVOICE_COLUMNS: ColumnDef<OpenInvoiceRow>[] = [
  {
    accessorKey: "folio",
    meta: { label: "Folio" },
    header: ({ column }) => <SortableHeader column={column} />,
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{row.original.folio}</span>
    ),
  },
  {
    accessorKey: "client",
    meta: { label: "Customer" },
    header: ({ column }) => <SortableHeader column={column} />,
  },
  {
    accessorKey: "balanceMinor",
    meta: { label: "Balance" },
    header: ({ column }) => <SortableHeader column={column} />,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatMoneyMinor(row.original.balanceMinor, GALLERY_CURRENCY_CODE)}
      </div>
    ),
  },
  {
    accessorKey: "totalMinor",
    meta: { label: "Total" },
    header: ({ column }) => <SortableHeader column={column} />,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatMoneyMinor(row.original.totalMinor, GALLERY_CURRENCY_CODE)}
      </div>
    ),
  },
  {
    accessorKey: "paymentStatus",
    meta: { label: "Payment" },
    header: "Payment",
    cell: ({ row }) => (
      <PaymentStatusBadge status={row.original.paymentStatus} />
    ),
  },
  {
    accessorKey: "dueDate",
    meta: { label: "Due" },
    header: ({ column }) => <SortableHeader column={column} />,
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {row.original.dueDate}
      </span>
    ),
  },
];
