import { simulateRequest } from "../../../_shared/lib/simulate-request";
import type { TodayMetrics } from "./mock-today-metrics";
import { getTodayMetrics } from "./mock-today-metrics";

export interface TodayOverviewData {
  metrics: TodayMetrics;
}

export async function fetchTodayOverview(): Promise<TodayOverviewData> {
  return await simulateRequest({
    metrics: getTodayMetrics(),
  });
}
