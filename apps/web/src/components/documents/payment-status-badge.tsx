"use client";

import type { PaymentStatus } from "@workspace/db/schema";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { cn } from "@workspace/ui/lib/utils";

const PAYMENT_STATUS_CLASSES: Record<PaymentStatus, string> = {
  unpaid:
    "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  partial:
    "border-orange-500/30 bg-orange-500/10 text-orange-800 dark:text-orange-300",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  partial: "Partial",
  paid: "Paid",
};

export function PaymentStatusBadge({
  status,
  className,
  ...props
}: React.ComponentProps<typeof Badge> & { status: PaymentStatus }) {
  return (
    <Badge
      className={cn(PAYMENT_STATUS_CLASSES[status], className)}
      data-slot="payment-status-badge"
      data-status={status}
      variant="outline"
      {...props}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
