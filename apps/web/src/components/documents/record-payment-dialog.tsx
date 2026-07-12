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
import { useRecordPayment } from "@/hooks/use-documents";
import { intlLocale } from "@/lib/locale";
import { m } from "@/paraglide/messages.js";
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

  const handleSubmit = async (data: DocumentPaymentFormValues) => {
    const amount = majorToMinor(data.amountMajor, currencyCode);
    await recordPayment.mutateAsync({
      input: {
        amount,
        method: data.method,
        allocations: [{ documentId: docId, amount }],
      },
    });
    onOpenChange(false);
  };

  const balanceFormatted = formatMoneyMinor(balanceDue, currencyCode, {
    locale: intlLocale(),
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="flex-row items-start gap-3 sm:items-center">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DialogTitle>{m.documents_record_payment()}</DialogTitle>
            <DialogDescription className="min-w-0 truncate">
              {folioLabel}
              {entityName ? ` · ${entityName}` : ""} ·{" "}
              {m.documents_payment_balance({ amount: balanceFormatted })}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              {m.common_cancel()}
            </Button>
            <Button
              disabled={recordPayment.isPending}
              form={DOCUMENT_PAYMENT_FORM_ID}
              size="sm"
              type="submit"
            >
              {recordPayment.isPending ? m.common_saving() : m.documents_pay()}
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
