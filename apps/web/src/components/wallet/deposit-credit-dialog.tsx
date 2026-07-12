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
  DEFAULT_CURRENCY,
  formatMajorInputValue,
  majorToMinor,
} from "@workspace/ui/lib/money";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useDepositCredit } from "@/hooks/use-wallet";
import { m } from "@/paraglide/messages.js";

export function DepositCreditDialog({
  entityId,
  disabled,
  disabledReason,
}: {
  entityId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [amountMajor, setAmountMajor] = useState(0);
  const [notes, setNotes] = useState("");
  const depositCredit = useDepositCredit();

  const reset = () => {
    setAmountMajor(0);
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = majorToMinor(amountMajor, DEFAULT_CURRENCY);
    if (amount <= 0) {
      return;
    }
    await depositCredit.mutateAsync({
      entityId,
      amount,
      type: "deposit",
      notes: notes.trim() || null,
    });
    reset();
    setOpen(false);
  };

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
        disabled={disabled}
        render={
          <Button
            disabled={disabled}
            size="sm"
            title={disabled ? disabledReason : undefined}
            variant="outline"
          />
        }
      >
        <Plus className="mr-2 size-4" />
        {m.wallet_deposit()}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{m.wallet_deposit_title()}</DialogTitle>
            <DialogDescription>
              {m.wallet_deposit_description()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">
                {m.documents_payment_amount()}
              </Label>
              <Input
                id="deposit-amount"
                min={0}
                onChange={(e) => setAmountMajor(Number(e.target.value) || 0)}
                required
                step="0.01"
                type="number"
                value={formatMajorInputValue(amountMajor, DEFAULT_CURRENCY)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deposit-notes">{m.wallet_notes()}</Label>
              <Input
                id="deposit-notes"
                onChange={(e) => setNotes(e.target.value)}
                placeholder={m.wallet_notes_placeholder()}
                value={notes}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={
                depositCredit.isPending ||
                amountMajor <= 0 ||
                majorToMinor(amountMajor, DEFAULT_CURRENCY) <= 0
              }
              type="submit"
            >
              {m.wallet_deposit_submit()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
