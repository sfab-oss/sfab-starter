"use client";

import { can } from "@workspace/auth/access-control";
import { authClient } from "@workspace/auth/client";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Input } from "@workspace/ui/components/shadcn/input";
import {
  formatMajorInputValue,
  formatMoneyMinor,
  majorToMinor,
  minorToMajor,
  minorToMajorInput,
} from "@workspace/ui/lib/money";
import { useState } from "react";
import { useRedeemCredit } from "@/hooks/use-wallet";
import { intlLocale } from "@/lib/locale";
import { m } from "@/paraglide/messages.js";

export function PayFromCreditForm({
  docId,
  entityId,
  balanceDue,
  creditBalance,
  currencyCode,
}: {
  docId: string;
  entityId: string;
  balanceDue: number;
  creditBalance: number;
  currencyCode: string;
}) {
  const { data: activeMember } = authClient.useActiveMember();
  const canWrite = can("document:write", {
    role: activeMember?.role ?? null,
  });
  const redeemCredit = useRedeemCredit();
  const maxRedeemMinor = Math.min(balanceDue, creditBalance);
  const [amountMajor, setAmountMajor] = useState(
    minorToMajorInput(maxRedeemMinor, currencyCode)
  );

  if (creditBalance <= 0 || maxRedeemMinor <= 0) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = majorToMinor(amountMajor, currencyCode);
    if (amount <= 0 || amount > maxRedeemMinor) {
      return;
    }
    await redeemCredit.mutateAsync({
      entityId,
      documentId: docId,
      amount,
    });
  };

  return (
    <form className="space-y-2 rounded-lg border p-4" onSubmit={handleSubmit}>
      <h3 className="font-medium text-sm">Pay from store credit</h3>
      <p className="text-muted-foreground text-xs">
        {m.wallet_available_credit({
          amount: formatMoneyMinor(creditBalance, currencyCode, {
            locale: intlLocale(),
          }),
          max: formatMoneyMinor(maxRedeemMinor, currencyCode, {
            locale: intlLocale(),
          }),
        })}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="flex-1"
          disabled={!canWrite}
          max={minorToMajor(maxRedeemMinor, currencyCode)}
          min={0}
          onChange={(e) => setAmountMajor(Number(e.target.value) || 0)}
          step="0.01"
          title={canWrite ? undefined : "Requires document write permission"}
          type="number"
          value={formatMajorInputValue(amountMajor, currencyCode)}
        />
        <Button
          disabled={
            !canWrite ||
            redeemCredit.isPending ||
            amountMajor <= 0 ||
            majorToMinor(amountMajor, currencyCode) > maxRedeemMinor
          }
          title={canWrite ? undefined : "Requires document write permission"}
          type="submit"
        >
          Apply credit
        </Button>
      </div>
    </form>
  );
}
