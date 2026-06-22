"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { useState } from "react";
import { ActivityTimeline } from "../../../_shared/collect/activity-timeline";
import { getInvoiceActivity } from "../lib/mock-invoice-activity";
import type { PaymentFormValues } from "../lib/payment-form-schema";
import {
  type OpenInvoiceRow,
  toPaymentInvoiceContext,
} from "../lib/payment-types";
import { PaymentForm } from "./payment-form";

const PAYMENT_FORM_ID = "payment-form";

export function PaymentFormDialog({
  invoiceRow,
  open,
  onOpenChange,
  onSubmit,
}: {
  invoiceRow: OpenInvoiceRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PaymentFormValues) => void | Promise<void>;
}) {
  const invoice = toPaymentInvoiceContext(invoiceRow);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="sm:max-w-[calc(100%-2rem)]"
        data-slot="payment-form-dialog"
      >
        <DialogHeader className="flex-row items-center gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
            <DialogTitle>Record payment</DialogTitle>
            <span className="text-muted-foreground text-sm">·</span>
            <DialogDescription className="min-w-0 truncate">
              {invoice.folio} · {invoice.client}
            </DialogDescription>
          </div>
          <div
            className="flex shrink-0 items-center gap-2"
            data-slot="dialog-header-actions"
          >
            <Button
              onClick={() => onOpenChange(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting}
              form={PAYMENT_FORM_ID}
              size="sm"
              type="submit"
            >
              {isSubmitting ? "Saving…" : "Record payment"}
            </Button>
          </div>
        </DialogHeader>

        <DialogBody className="gap-0 px-0 pb-0">
          <div className="px-6 pb-6">
            <PaymentForm
              defaultAmountMinor={invoice.balanceMinor}
              formId={PAYMENT_FORM_ID}
              invoice={invoice}
              onSubmit={async (data) => {
                setIsSubmitting(true);
                try {
                  await onSubmit(data);
                  onOpenChange(false);
                } finally {
                  setIsSubmitting(false);
                }
              }}
            />
          </div>

          <div className="border-t" data-slot="payment-form-dialog-activity">
            <div className="px-6 pt-4 pb-6">
              <ActivityTimeline entries={getInvoiceActivity(invoiceRow)} />
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
