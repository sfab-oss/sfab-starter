import type { CreateProduct, UpdateProduct } from "@workspace/contract/catalog";
import type { PaginationQuery } from "@workspace/contract/pagination";
import { db } from "@workspace/db";
import { products } from "@workspace/db/schema";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
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

export const getProducts = async (orgId: string) => {
  return await db
    .select(productSelectFields)
    .from(products)
    .where(eq(products.organizationId, orgId));
};

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
  return await db.insert(products).values(formattedData).returning();
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

  return updated;
};

export const deleteProduct = async (id: string, orgId: string) => {
  const [deleted] = await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.organizationId, orgId)))
    .returning();
  return deleted;
};
