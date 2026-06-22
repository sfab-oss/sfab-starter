import { MOCK_OPEN_INVOICES } from "../../../_shared/collect/mock-open-invoices";

export interface TodayMetrics {
  lowStockCount: number;
  invoicesToCollectCount: number;
}

export function getTodayMetrics(): TodayMetrics {
  const invoicesToCollect = MOCK_OPEN_INVOICES.filter(
    (row) => row.balanceMinor > 0
  );

  return {
    lowStockCount: 4,
    invoicesToCollectCount: invoicesToCollect.length,
  };
}
