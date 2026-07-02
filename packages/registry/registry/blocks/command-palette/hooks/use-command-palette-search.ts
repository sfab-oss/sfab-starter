"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchCommandPaletteSearch } from "../lib/fetch-command-palette-search";

export const getCommandPaletteSearchKey = () => ["command-palette", "search"];

export function commandPaletteSearchQueryOptions() {
  return queryOptions({
    queryKey: getCommandPaletteSearchKey(),
    queryFn: () => fetchCommandPaletteSearch(),
  });
}

export function useCommandPaletteSearch() {
  return useQuery(commandPaletteSearchQueryOptions());
}
