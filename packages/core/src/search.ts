import { db } from "@workspace/db-d1";
import { products, warehouses } from "@workspace/db-d1/schema";
import type { SearchResult } from "@workspace/types/search";
import { and, eq, ilike, or } from "drizzle-orm";

export const searchInventory = async (
  userId: string,
  query: string
): Promise<SearchResult[]> => {
  const searchPattern = `%${query}%`;

  const productResults = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      description: products.description,
    })
    .from(products)
    .where(
      and(
        eq(products.userId, userId),
        or(
          ilike(products.name, searchPattern),
          ilike(products.sku, searchPattern)
        )
      )
    )
    .limit(10);

  const warehouseResults = await db
    .select({
      id: warehouses.id,
      name: warehouses.name,
      location: warehouses.location,
    })
    .from(warehouses)
    .where(
      and(eq(warehouses.userId, userId), ilike(warehouses.name, searchPattern))
    )
    .limit(10);

  const results: SearchResult[] = [
    ...productResults.map((p) => ({
      path: `/inventory/products/${p.id}`,
      snippet: p.description || `Product SKU: ${p.sku}`,
      score: 1.0,
      metadata: {
        type: "product" as const,
        id: p.id,
        title: p.name,
        sku: p.sku,
      },
    })),
    ...warehouseResults.map((w) => ({
      path: `/inventory/warehouses/${w.id}`,
      snippet: w.location || "Warehouse location not specified",
      score: 0.9,
      metadata: {
        type: "warehouse" as const,
        id: w.id,
        title: w.name,
        location: w.location,
      },
    })),
  ];

  return results.sort((a, b) => b.score - a.score);
};
