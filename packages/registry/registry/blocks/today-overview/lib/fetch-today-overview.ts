import { simulateRequest } from "../../../_shared/lib/simulate-request";
import type { InventoryMovementRow } from "./mock-inventory-movements";
import { MOCK_INVENTORY_MOVEMENTS } from "./mock-inventory-movements";
import type { TodayMetrics } from "./mock-today-metrics";
import { getTodayMetrics } from "./mock-today-metrics";

export interface TodayOverviewData {
  metrics: TodayMetrics;
  movements: InventoryMovementRow[];
}

export async function fetchTodayOverview(): Promise<TodayOverviewData> {
  return await simulateRequest({
    metrics: getTodayMetrics(),
    movements: MOCK_INVENTORY_MOVEMENTS,
  });
}
