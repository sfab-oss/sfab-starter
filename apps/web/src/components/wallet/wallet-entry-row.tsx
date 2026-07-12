import { Badge } from "@workspace/ui/components/shadcn/badge";
import { DEFAULT_CURRENCY, formatMoneyMinor } from "@workspace/ui/lib/money";
import { format } from "date-fns";
import type { WalletEntry } from "@/hooks/use-wallet";
import { dateFnsLocale, intlLocale } from "@/lib/locale";

const TYPE_LABELS: Record<WalletEntry["type"], string> = {
  deposit: "Deposit",
  overpay: "Overpay",
  store_credit: "Store credit",
  claim: "Claim",
  redemption: "Redemption",
  correction: "Correction",
};

export function WalletEntryRow({ entry }: { entry: WalletEntry }) {
  const isCredit = entry.amount > 0;

  return (
    <div className="flex items-start gap-3 px-4 py-3 text-sm">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="capitalize" variant="secondary">
            {TYPE_LABELS[entry.type]}
          </Badge>
          <span className="text-muted-foreground text-xs">
            {format(new Date(entry.createdAt), "MMM d, yyyy h:mm a", {
              locale: dateFnsLocale(),
            })}
          </span>
        </div>
        {entry.notes ? (
          <p className="text-muted-foreground text-xs">{entry.notes}</p>
        ) : null}
      </div>
      <span
        className={`shrink-0 font-medium tabular-nums ${isCredit ? "text-emerald-600 dark:text-emerald-400" : ""}`}
      >
        {isCredit ? "+" : ""}
        {formatMoneyMinor(entry.amount, DEFAULT_CURRENCY, {
          locale: intlLocale(),
        })}
      </span>
    </div>
  );
}
