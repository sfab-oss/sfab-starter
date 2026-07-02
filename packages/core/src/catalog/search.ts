import type { SearchResult } from "@workspace/contract/catalog";
import { db } from "@workspace/db";
import { products } from "@workspace/db/schema";
import { and, eq, like, or } from "drizzle-orm";

export const searchCatalog = async (
  orgId: string,
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
        eq(products.organizationId, orgId),
        or(
          like(products.name, searchPattern),
          like(products.sku, searchPattern)
        )
      )
    )
    .limit(10);

  return productResults.map((p) => ({
    path: `/catalog/products/${p.id}`,
    snippet: p.description || `Product SKU: ${p.sku}`,
    score: 1.0,
    metadata: {
      type: "product" as const,
      id: p.id,
      title: p.name,
      sku: p.sku,
    },
  }));
};
