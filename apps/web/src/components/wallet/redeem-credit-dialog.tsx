"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/shadcn/dialog";
import { Input } from "@workspace/ui/components/shadcn/input";
import { Label } from "@workspace/ui/components/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/shadcn/select";
import {
  DEFAULT_CURRENCY,
  formatMajorInputValue,
  formatMoneyMinor,
  majorToMinor,
  minorToMajor,
  minorToMajorInput,
} from "@workspace/ui/lib/money";
import { Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import {
  documentFolioLabel,
  documentTypeLabel,
} from "@/components/documents/document-type";
import type { DocumentRow } from "@/hooks/use-documents";
import { useRedeemCredit } from "@/hooks/use-wallet";

export function RedeemCreditDialog({
  entityId,
  creditBalance,
  openInvoices,
  disabled,
  disabledReason,
}: {
  entityId: string;
  creditBalance: number;
  openInvoices: DocumentRow[];
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [documentId, setDocumentId] = useState<string>("");
  const redeemCredit = useRedeemCredit();

  const selected = useMemo(
    () => openInvoices.find((doc) => doc.id === documentId) ?? null,
    [documentId, openInvoices]
  );

  const maxRedeemMinor = selected
    ? Math.min(creditBalance, selected.balanceDue)
    : 0;
  const currencyCode = selected?.currencyCode ?? DEFAULT_CURRENCY;

  const [amountMajor, setAmountMajor] = useState(0);

  const reset = () => {
    setDocumentId("");
    setAmountMajor(0);
  };

  const handleDocumentChange = (nextId: string | null) => {
    if (nextId == null) {
      return;
    }
    setDocumentId(nextId);
    const doc = openInvoices.find((row) => row.id === nextId);
    if (!doc) {
      setAmountMajor(0);
      return;
    }
    setAmountMajor(
      minorToMajorInput(
        Math.min(creditBalance, doc.balanceDue),
        doc.currencyCode
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      return;
    }
    const amount = majorToMinor(amountMajor, selected.currencyCode);
    if (amount <= 0 || amount > maxRedeemMinor) {
      return;
    }
    await redeemCredit.mutateAsync({
      entityId,
      documentId: selected.id,
      amount,
    });
    reset();
    setOpen(false);
  };

  const triggerDisabled =
    disabled || creditBalance <= 0 || openInvoices.length === 0;

  let triggerTitle: string | undefined;
  if (disabled) {
    triggerTitle = disabledReason;
  } else if (creditBalance <= 0) {
    triggerTitle = "No store credit to redeem";
  } else if (openInvoices.length === 0) {
    triggerTitle = "No open invoices to apply credit against";
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
        }
      }}
      open={open}
    >
      <DialogTrigger
        disabled={triggerDisabled}
        render={
          <Button
            disabled={triggerDisabled}
            size="sm"
            title={triggerTitle}
            variant="outline"
          />
        }
      >
        <Wallet className="mr-2 size-4" />
        Redeem
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Redeem store credit</DialogTitle>
            <DialogDescription>
              Apply wallet balance to an open invoice. Available credit{" "}
              {formatMoneyMinor(creditBalance, DEFAULT_CURRENCY)}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="redeem-invoice">Open invoice</Label>
              <Select
                onValueChange={handleDocumentChange}
                value={documentId || undefined}
              >
                <SelectTrigger className="w-full" id="redeem-invoice">
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent>
                  {openInvoices.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {documentTypeLabel(doc.type)} {documentFolioLabel(doc)} ·{" "}
                      {formatMoneyMinor(doc.balanceDue, doc.currencyCode)} due
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="redeem-amount">Amount</Label>
              <Input
                disabled={!selected}
                id="redeem-amount"
                max={minorToMajor(maxRedeemMinor, currencyCode)}
                min={0}
                onChange={(e) => setAmountMajor(Number(e.target.value) || 0)}
                required
                step="0.01"
                type="number"
                value={formatMajorInputValue(amountMajor, currencyCode)}
              />
              {selected ? (
                <p className="text-muted-foreground text-xs">
                  Max {formatMoneyMinor(maxRedeemMinor, selected.currencyCode)}{" "}
                  (lesser of credit and balance due).
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                redeemCredit.isPending ||
                !selected ||
                amountMajor <= 0 ||
                majorToMinor(amountMajor, currencyCode) > maxRedeemMinor
              }
              type="submit"
            >
              Apply credit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
