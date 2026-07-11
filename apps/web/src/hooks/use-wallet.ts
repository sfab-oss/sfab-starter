"use client";

import { useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/client";

export {
  useDepositCredit,
  useRedeemCredit,
  useRedeemCreditByReference,
} from "@/hooks/use-documents";

export type WalletEntry = InferResponseType<
  (typeof client.protected.wallet.entries)["$get"],
  200
>["data"][number];

export const getWalletEntriesKey = (entityId: string) =>
  ["wallet", "entries", entityId] as const;

export const getWalletBalanceKey = (entityId: string) =>
  ["wallet", "balance", entityId] as const;

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

export const useWalletBalance = (entityId: string) =>
  useQuery({
    queryKey: getWalletBalanceKey(entityId),
    queryFn: async () => {
      const res = await client.protected.wallet.balance[":entityId"].$get({
        param: { entityId },
      });
      if (!res.ok) {
        throw new Error("Failed to load wallet balance");
      }
      return res.json();
    },
    enabled: Boolean(entityId),
  });
