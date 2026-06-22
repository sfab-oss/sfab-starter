"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchTodayOverview } from "../lib/fetch-today-overview";

export const getTodayOverviewKey = () => ["today-overview"];

export function todayOverviewQueryOptions() {
  return queryOptions({
    queryKey: getTodayOverviewKey(),
    queryFn: () => fetchTodayOverview(),
  });
}

export function useTodayOverview() {
  return useQuery(todayOverviewQueryOptions());
}
