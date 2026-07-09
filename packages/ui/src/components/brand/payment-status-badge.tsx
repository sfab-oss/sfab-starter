"use client";

import { Badge } from "@workspace/ui/components/shadcn/badge";
import { cn } from "@workspace/ui/lib/utils";

export const paymentStatusValues = ["unpaid", "partial", "paid"] as const;

export type PaymentStatus = (typeof paymentStatusValues)[number];

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

export type PaymentStatusBadgeProps = React.ComponentProps<typeof Badge> & {
  status: PaymentStatus;
};

export function PaymentStatusBadge({
  status,
  className,
  ...props
}: PaymentStatusBadgeProps) {
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
