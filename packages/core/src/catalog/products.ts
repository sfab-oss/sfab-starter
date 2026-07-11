import type { CreateProduct, UpdateProduct } from "@workspace/contract/catalog";
import type { PaginationQuery } from "@workspace/contract/pagination";
import { db } from "@workspace/db";
import type { Product } from "@workspace/db/schema";
import { products } from "@workspace/db/schema";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { DomainError } from "../errors";
import {
  buildPaginatedResponse,
  getPaginationOffsetLimit,
} from "../pagination";

const productSelectFields = {
  id: products.id,
  organizationId: products.organizationId,
  sku: products.sku,
  name: products.name,
  description: products.description,
  price: products.price,
  cost: products.cost,
  minStockLevel: products.minStockLevel,
  imageUrl: products.imageUrl,
  createdAt: products.createdAt,
  updatedAt: products.updatedAt,
};

const productSortColumns = {
  name: products.name,
  sku: products.sku,
  price: products.price,
  createdAt: products.createdAt,
} as const;

export const getPaginatedProducts = async (
  orgId: string,
  params: PaginationQuery
) => {
  const { offset, limit } = getPaginationOffsetLimit(params);

  const conditions = [eq(products.organizationId, orgId)];
  if (params.search) {
    const searchPattern = `%${params.search}%`;
    const searchCondition = or(
      like(products.name, searchPattern),
      like(products.sku, searchPattern)
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }
  const whereClause = and(...conditions);

  const countResult = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(products)
    .where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const sortColumn =
    params.sortBy && params.sortBy in productSortColumns
      ? productSortColumns[params.sortBy as keyof typeof productSortColumns]
      : null;
  const dirFn = params.sortOrder === "desc" ? desc : asc;
  const sortTarget = sortColumn ?? products.name;

  const data = await db
    .select(productSelectFields)
    .from(products)
    .where(whereClause)
    .orderBy(dirFn(sortTarget))
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(data, total, params);
};

export const getProducts = async (orgId: string) =>
  await db
    .select(productSelectFields)
    .from(products)
    .where(eq(products.organizationId, orgId));

export const getProduct = async (id: string, orgId: string) => {
  const [product] = await db
    .select(productSelectFields)
    .from(products)
    .where(and(eq(products.id, id), eq(products.organizationId, orgId)));

  return product;
};

export const createProduct = async (
  data: CreateProduct & { orgId: string }
) => {
  const formattedData = {
    ...data,
    organizationId: data.orgId,
  };
  const created = await db.insert(products).values(formattedData).returning();
  if (!created[0]) {
    throw new DomainError("Failed to create product", "unprocessable");
  }
  return created;
};

export const updateProduct = async (
  id: string,
  orgId: string,
  data: UpdateProduct
) => {
  const formattedData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  const [updated] = await db
    .update(products)
    .set(formattedData)
    .where(and(eq(products.id, id), eq(products.organizationId, orgId)))
    .returning();

  if (!updated) {
    throw new DomainError(`Product not found: ${id}`, "not_found");
  }
  return updated;
};

export const deleteProduct = async (id: string, orgId: string) => {
  const [deleted] = await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.organizationId, orgId)))
    .returning();
  if (!deleted) {
    throw new DomainError(`Product not found: ${id}`, "not_found");
  }
  return deleted;
};

export const resolveProductRef = async (
  orgId: string,
  ref: string
): Promise<Product> => {
  const trimmed = ref.trim();
  if (!trimmed) {
    throw new DomainError(
      `Product not found: no match for id, name, or sku "${ref}"`,
      "not_found"
    );
  }

  const byId = await getProduct(trimmed, orgId);
  if (byId) {
    return byId;
  }

  const byName = await db
    .select(productSelectFields)
    .from(products)
    .where(and(eq(products.organizationId, orgId), eq(products.name, trimmed)));
  if (byName.length > 1) {
    throw new DomainError(
      `ambiguous product ref: ${byName.length} matches for "${trimmed}"`,
      "conflict"
    );
  }
  if (byName.length === 1) {
    return byName[0] as Product;
  }

  const bySku = await db
    .select(productSelectFields)
    .from(products)
    .where(and(eq(products.organizationId, orgId), eq(products.sku, trimmed)));
  if (bySku.length > 1) {
    throw new DomainError(
      `ambiguous product ref: ${bySku.length} matches for "${trimmed}"`,
      "conflict"
    );
  }
  if (bySku.length === 1) {
    return bySku[0] as Product;
  }

  throw new DomainError(
    `Product not found: no match for id, name, or sku "${trimmed}"`,
    "not_found"
  );
};
