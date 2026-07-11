import type { WalletEntry } from "@/hooks/use-wallet";
import { WalletEntryRow } from "./wallet-entry-row";

export function WalletLedger({
  entries,
  isLoading,
}: {
  entries: WalletEntry[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="px-4 py-6 text-center text-muted-foreground text-sm">
        Loading ledger...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-muted-foreground text-sm">
        No wallet activity yet. Deposits and redemptions will appear here.
      </div>
    );
  }

  return (
    <div className="divide-y">
      {entries.map((entry) => (
        <WalletEntryRow entry={entry} key={entry.id} />
      ))}
    </div>
  );
}
