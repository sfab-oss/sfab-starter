"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { formatMoneyMinor, majorToMinor } from "@workspace/ui/lib/money";
import { useState } from "react";
import { useRecordPayment } from "@/hooks/use-documents";
import {
  DOCUMENT_PAYMENT_FORM_ID,
  DocumentPaymentForm,
  type DocumentPaymentFormValues,
} from "./document-payment-form";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
  folioLabel: string;
  entityName: string | null;
  total: number;
  amountPaid: number;
  balanceDue: number;
  currencyCode: string;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  docId,
  folioLabel,
  entityName,
  total,
  amountPaid,
  balanceDue,
  currencyCode,
}: RecordPaymentDialogProps) {
  const recordPayment = useRecordPayment();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: DocumentPaymentFormValues) => {
    const amount = majorToMinor(data.amountMajor, currencyCode);
    setIsSubmitting(true);
    try {
      await recordPayment.mutateAsync({
        input: {
          amount,
          method: data.method,
          allocations: [{ documentId: docId, amount }],
        },
      });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="flex-row items-start gap-3 sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription className="min-w-0 truncate">
              {folioLabel}
              {entityName ? ` · ${entityName}` : ""} · Balance{" "}
              {formatMoneyMinor(balanceDue, currencyCode)}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={isSubmitting || recordPayment.isPending}
              form={DOCUMENT_PAYMENT_FORM_ID}
              size="sm"
              type="submit"
            >
              {isSubmitting || recordPayment.isPending ? "Saving…" : "Pay"}
            </Button>
          </div>
        </DialogHeader>

        <DocumentPaymentForm
          amountPaid={amountPaid}
          balanceDue={balanceDue}
          currencyCode={currencyCode}
          key={`${docId}-${balanceDue}`}
          onSubmit={handleSubmit}
          total={total}
        />
      </DialogContent>
    </Dialog>
  );
}
