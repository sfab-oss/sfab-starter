import { formatMoneyMinor } from "@workspace/ui/lib/money";
import type { ActivityTimelineEntry } from "../../../_shared/collect/activity-timeline";
import { GALLERY_CURRENCY_CODE, type OpenInvoiceRow } from "./payment-types";

const INVOICE_ACTIVITY: Record<string, ActivityTimelineEntry[]> = {
  "inv-1042": [
    {
      id: "inv-1042-1",
      at: "2026-06-18T14:22:00",
      field: "Due date",
      value: "2026-06-24",
      actor: "Ana Ruiz",
    },
    {
      id: "inv-1042-2",
      at: "2026-06-15T09:10:00",
      field: "Balance",
      value: formatMoneyMinor(750_000, GALLERY_CURRENCY_CODE),
      actor: "Carlos Mendez",
    },
    {
      id: "inv-1042-3",
      at: "2026-06-15T09:10:00",
      field: "Paid",
      value: formatMoneyMinor(500_000, GALLERY_CURRENCY_CODE),
      actor: "Carlos Mendez",
    },
    {
      id: "inv-1042-4",
      at: "2026-06-10T11:30:00",
      field: "Status",
      value: "Partial",
      actor: "Carlos Mendez",
    },
    {
      id: "inv-1042-5",
      at: "2026-06-01T08:00:00",
      field: "Total",
      value: formatMoneyMinor(1_250_000, GALLERY_CURRENCY_CODE),
      actor: "System",
    },
  ],
  "inv-1043": [
    {
      id: "inv-1043-1",
      at: "2026-06-12T16:45:00",
      field: "Due date",
      value: "2026-06-26",
      actor: "Ana Ruiz",
    },
    {
      id: "inv-1043-2",
      at: "2026-06-05T10:15:00",
      field: "Status",
      value: "Unpaid",
      actor: "System",
    },
    {
      id: "inv-1043-3",
      at: "2026-06-05T10:15:00",
      field: "Total",
      value: formatMoneyMinor(425_000, GALLERY_CURRENCY_CODE),
      actor: "System",
    },
  ],
  "inv-1038": [
    {
      id: "inv-1038-1",
      at: "2026-06-20T17:00:00",
      field: "Status",
      value: "Paid",
      actor: "Carlos Mendez",
    },
    {
      id: "inv-1038-2",
      at: "2026-06-20T17:00:00",
      field: "Balance",
      value: formatMoneyMinor(0, GALLERY_CURRENCY_CODE),
      actor: "Carlos Mendez",
    },
    {
      id: "inv-1038-3",
      at: "2026-06-08T12:20:00",
      field: "Total",
      value: formatMoneyMinor(890_000, GALLERY_CURRENCY_CODE),
      actor: "System",
    },
  ],
};

const DEFAULT_ACTIVITY: ActivityTimelineEntry[] = [
  {
    id: "default-1",
    at: "2026-06-01T08:00:00",
    field: "Created",
    value: "Invoice issued",
    actor: "System",
  },
];

export function getInvoiceActivity(
  invoice: OpenInvoiceRow
): ActivityTimelineEntry[] {
  return INVOICE_ACTIVITY[invoice.id] ?? DEFAULT_ACTIVITY;
}
