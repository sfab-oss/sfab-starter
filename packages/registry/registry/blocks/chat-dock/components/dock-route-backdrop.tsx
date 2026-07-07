"use client";

import {
  ShellHeader,
  ShellHeaderSidebarTrigger,
  ShellHeaderTitle,
} from "@workspace/ui/components/brand/shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";

/**
 * Gallery-only backdrop: a representative operations route so the floating chat
 * dock reads in context. Not part of the block's install (`files[]`) — it is
 * preview scaffolding, like the `_shared/` helpers.
 */
const METRICS = [
  { label: "Open receivables", value: "$91,400", hint: "3 customers" },
  { label: "Due this week", value: "$79,200", hint: "5 invoices" },
  { label: "Low stock SKUs", value: "12", hint: "Main DC" },
  { label: "Orders today", value: "38", hint: "+6 vs. yesterday" },
];

const ROWS = [
  { customer: "Northside Distributors", ref: "INV-1042", amount: "$75,000" },
  { customer: "Bayview Supply", ref: "INV-1038", amount: "$12,400" },
  { customer: "Lakeside Foods", ref: "INV-1035", amount: "$4,200" },
];

export function DockRouteBackdrop() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <ShellHeaderTitle>Today</ShellHeaderTitle>
      </ShellHeader>
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {METRICS.map((metric) => (
              <Card key={metric.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-normal text-muted-foreground text-sm">
                    {metric.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold text-2xl tracking-tight">
                    {metric.value}
                  </p>
                  <p className="text-muted-foreground text-xs">{metric.hint}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Open balances due soon
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col divide-y">
              {ROWS.map((row) => (
                <div
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  key={row.ref}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-sm">
                      {row.customer}
                    </p>
                    <p className="text-muted-foreground text-xs">{row.ref}</p>
                  </div>
                  <span className="font-medium text-sm tabular-nums">
                    {row.amount}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
