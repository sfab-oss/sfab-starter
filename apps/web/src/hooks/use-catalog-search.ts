"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { InferResponseType } from "hono/client";
import { client } from "@/lib/client";

export type CatalogSearchResponse = InferResponseType<
  (typeof client.protected.catalog.search)["$get"],
  200
>;

export type CatalogSearchResult = CatalogSearchResponse["results"][number];

export const getCatalogSearchKey = (query: string) => [
  "catalog",
  "search",
  query,
];

export function useCatalogSearch(query: string, enabled: boolean) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: getCatalogSearchKey(trimmed),
    queryFn: async () => {
      const res = await client.protected.catalog.search.$get({
        query: { q: trimmed },
      });
      if (!res.ok) {
        throw new Error("Catalog search failed");
      }
      return res.json();
    },
    enabled: enabled && trimmed.length >= 2,
    placeholderData: keepPreviousData,
  });
}
