"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  COMMAND_PALETTE_MOCK_ACTIONS,
  COMMAND_PALETTE_MOCK_SEARCH_GROUPS,
} from "../../../_shared/mock-command-palette-search";
import { fetchCommandPaletteSearch } from "../lib/fetch-command-palette-search";

export const getCommandPaletteSearchKey = () => ["command-palette", "search"];

export function commandPaletteSearchQueryOptions() {
  return queryOptions({
    queryKey: getCommandPaletteSearchKey(),
    queryFn: () => fetchCommandPaletteSearch(),
  });
}

export function commandPaletteSearchPlaceholderData() {
  return {
    actions: COMMAND_PALETTE_MOCK_ACTIONS,
    searchGroups: COMMAND_PALETTE_MOCK_SEARCH_GROUPS,
  };
}

export function useCommandPaletteSearch() {
  return useQuery({
    ...commandPaletteSearchQueryOptions(),
    placeholderData: commandPaletteSearchPlaceholderData(),
  });
}
