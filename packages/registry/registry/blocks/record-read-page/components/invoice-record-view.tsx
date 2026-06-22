"use client";

import { formatMoneyMinor } from "@workspace/ui/lib/money";
import { ActivityTimeline } from "../../../_shared/collect/activity-timeline";
import { PropertyGrid } from "../../../_shared/collect/property-grid";
import { getInvoiceActivity } from "../lib/mock-invoice-activity";
import {
  GALLERY_CURRENCY_CODE,
  type OpenInvoiceRow,
} from "../lib/payment-types";

export function InvoiceRecordView({ invoice }: { invoice: OpenInvoiceRow }) {
  return (
    <div className="flex w-full flex-col" data-slot="invoice-record-view">
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <PropertyGrid
          items={[
            {
              label: "Total",
              value: formatMoneyMinor(
                invoice.totalMinor,
                GALLERY_CURRENCY_CODE
              ),
            },
            {
              label: "Paid",
              value: formatMoneyMinor(invoice.paidMinor, GALLERY_CURRENCY_CODE),
            },
            {
              label: "Balance",
              value: formatMoneyMinor(
                invoice.balanceMinor,
                GALLERY_CURRENCY_CODE
              ),
            },
            { label: "Due date", value: invoice.dueDate },
            {
              label: "Notes",
              value: invoice.notes ?? "—",
              className: "sm:col-span-2",
            },
          ]}
        />
      </div>

      <div className="border-t" data-slot="invoice-record-activity">
        <div className="mx-auto w-full max-w-3xl px-6 pt-4">
          <ActivityTimeline entries={getInvoiceActivity(invoice)} />
        </div>
      </div>
    </div>
  );
}
