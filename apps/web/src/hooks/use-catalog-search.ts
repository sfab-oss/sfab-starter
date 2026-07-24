"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { client } from "@/lib/client";

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
