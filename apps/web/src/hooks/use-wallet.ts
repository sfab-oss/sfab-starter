"use client";

import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/client";

export {
  useDepositCredit,
  useRedeemCredit,
} from "@/hooks/use-documents";

export type WalletEntry = InferResponseType<
  (typeof client.protected.wallet.entries)["$get"],
  200
>["data"][number];

export const getWalletEntriesKey = (entityId: string) =>
  ["wallet", "entries", entityId] as const;

export const useWalletEntries = (entityId: string) =>
  useQuery({
    queryKey: getWalletEntriesKey(entityId),
    queryFn: async () => {
      const res = await client.protected.wallet.entries.$get({
        query: { entityId },
      });
      if (!res.ok) {
        throw new Error("Failed to load wallet entries");
      }
      return res.json();
    },
    enabled: Boolean(entityId),
  });
