import { useQuery } from "@tanstack/react-query";
import type { SearchResponse } from "@workspace/types/search";
import { apiClient } from "@/lib/api-client";

export function useSearch(query: string) {
  return useQuery<SearchResponse>({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query) {
        return { results: [] };
      }
      const response = await apiClient.api.inventory.search.$get({
        query: { q: query },
      });
      if (!response.ok) {
        throw new Error("Search failed");
      }
      return response.json();
    },
    enabled: query.length > 0,
  });
}
