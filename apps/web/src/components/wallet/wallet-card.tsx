"use client";

import { can } from "@workspace/auth/access-control";
import { authClient } from "@workspace/auth/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { DEFAULT_CURRENCY, formatMoneyMinor } from "@workspace/ui/lib/money";
import { Wallet } from "lucide-react";
import { useMemo } from "react";
import { useDocuments } from "@/hooks/use-documents";
import { useWalletEntries } from "@/hooks/use-wallet";
import { DepositCreditDialog } from "./deposit-credit-dialog";
import { RedeemCreditDialog } from "./redeem-credit-dialog";
import { WalletLedger } from "./wallet-ledger";

export function WalletCard({
  entityId,
  creditBalance,
  isArchived,
}: {
  entityId: string;
  creditBalance: number;
  isArchived?: boolean;
}) {
  const { data: activeMember } = authClient.useActiveMember();
  const canWrite = can("document:write", {
    role: activeMember?.role ?? null,
  });
  const writeDisabledReason = canWrite
    ? undefined
    : "Requires document write permission";

  const { data: entriesResp, isLoading: entriesLoading } =
    useWalletEntries(entityId);
  const { data: docsResp } = useDocuments("invoice", entityId);

  const entries = entriesResp?.data ?? [];
  const openInvoices = useMemo(
    () =>
      (docsResp?.data ?? []).filter(
        (doc) => doc.status === "finalized" && doc.balanceDue > 0
      ),
    [docsResp?.data]
  );

  const depositDisabled = isArchived || !canWrite;
  const depositDisabledReason = isArchived
    ? "Archived entities cannot receive deposits"
    : writeDisabledReason;

  const redeemDisabled = isArchived || !canWrite;
  const redeemDisabledReason = isArchived
    ? "Archived entities cannot redeem credit"
    : writeDisabledReason;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="size-4 text-muted-foreground" />
              Store credit
            </CardTitle>
            <CardDescription>
              Prepaid wallet balance for this entity.
            </CardDescription>
          </div>
        </div>
        <div>
          <div className="font-bold text-2xl tabular-nums">
            {formatMoneyMinor(creditBalance, DEFAULT_CURRENCY)}
          </div>
          {creditBalance === 0 ? (
            <p className="mt-1 text-muted-foreground text-xs">
              No credit on file. Deposit prepaid balance to apply against open
              invoices later.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground text-xs">
              Available to redeem against open sales invoices.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <DepositCreditDialog
            disabled={depositDisabled}
            disabledReason={depositDisabledReason}
            entityId={entityId}
          />
          <RedeemCreditDialog
            creditBalance={creditBalance}
            disabled={redeemDisabled}
            disabledReason={redeemDisabledReason}
            entityId={entityId}
            openInvoices={openInvoices}
          />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="border-t">
          <div className="px-6 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Ledger
          </div>
          <WalletLedger entries={entries} isLoading={entriesLoading} />
        </div>
      </CardContent>
    </Card>
  );
}
