export interface InventoryMovementRow {
  id: string;
  productName: string;
  warehouse: string;
  /** Signed quantity change in sellable units. */
  quantityDelta: number;
  at: string;
  actor: string;
}

/** Interim manual-movement feed — not document activity (operator-ux §5.1). */
export const MOCK_INVENTORY_MOVEMENTS: InventoryMovementRow[] = [
  {
    id: "mov-1",
    productName: "20L water jug",
    warehouse: "Main",
    quantityDelta: -12,
    at: "2026-06-21T09:14:00",
    actor: "Ana Ruiz",
  },
  {
    id: "mov-2",
    productName: "Ice bag 5 kg",
    warehouse: "Main",
    quantityDelta: 40,
    at: "2026-06-21T08:42:00",
    actor: "Carlos Mendez",
  },
  {
    id: "mov-3",
    productName: "Sparkling water case",
    warehouse: "North depot",
    quantityDelta: -6,
    at: "2026-06-20T16:05:00",
    actor: "Ana Ruiz",
  },
  {
    id: "mov-4",
    productName: "Cooler rental",
    warehouse: "Main",
    quantityDelta: 2,
    at: "2026-06-20T11:30:00",
    actor: "Lena Ortiz",
  },
  {
    id: "mov-5",
    productName: "20L water jug",
    warehouse: "Main",
    quantityDelta: -24,
    at: "2026-06-20T07:55:00",
    actor: "Carlos Mendez",
  },
];

export const INVENTORY_MOVEMENTS_FEED_LIMIT = 5;
