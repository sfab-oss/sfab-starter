"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
        <DialogHeader className="pr-8">
          <DialogTitle>{m.documents_record_payment()}</DialogTitle>
          <DialogDescription className="min-w-0">
            {folioLabel}
            {entityName ? ` · ${entityName}` : ""} ·{" "}
            {m.documents_payment_balance({ amount: balanceFormatted })}
          </DialogDescription>
        </DialogHeader>

        <DocumentPaymentForm
          amountPaid={amountPaid}
          balanceDue={balanceDue}
          currencyCode={currencyCode}
          key={`${docId}-${balanceDue}`}
          onSubmit={handleSubmit}
          total={total}
        />

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            {m.common_cancel()}
          </Button>
          <Button
            disabled={recordPayment.isPending}
            form={DOCUMENT_PAYMENT_FORM_ID}
            type="submit"
          >
            {recordPayment.isPending ? m.common_saving() : m.documents_pay()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
