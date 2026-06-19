import type { PaginationQuery } from "@workspace/contract/pagination";
import type {
  CreateMovement,
  CreateProduct,
  UpdateProduct,
} from "@workspace/contract/products";
import { db } from "@workspace/db";
import { movements, products, stockLevels } from "@workspace/db/schema";
import { and, asc, desc, eq, gte, like, or, sql } from "drizzle-orm";
import { buildPaginatedResponse, getPaginationOffsetLimit } from "./pagination";

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
  totalStock: sql<number>`coalesce(sum(${stockLevels.quantity}), 0)`.mapWith(
    Number
  ),
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
    .select({
      total: sql<number>`count(DISTINCT ${products.id})`.mapWith(Number),
    })
    .from(products)
    .leftJoin(stockLevels, eq(products.id, stockLevels.productId))
    .where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const sortColumn =
    params.sortBy && params.sortBy in productSortColumns
      ? productSortColumns[params.sortBy as keyof typeof productSortColumns]
      : null;
  const totalStockExpr = sql<number>`coalesce(sum(${stockLevels.quantity}), 0)`;
  const dirFn = params.sortOrder === "desc" ? desc : asc;
  const sortTarget =
    params.sortBy === "totalStock"
      ? totalStockExpr
      : sortColumn || products.name;
  const orderByClause = dirFn(sortTarget);

  const data = await db
    .select(productSelectFields)
    .from(products)
    .leftJoin(stockLevels, eq(products.id, stockLevels.productId))
    .where(whereClause)
    .groupBy(products.id)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(data, total, params);
};

export const getProducts = async (orgId: string) => {
  return await db
    .select(productSelectFields)
    .from(products)
    .leftJoin(stockLevels, eq(products.id, stockLevels.productId))
    .where(eq(products.organizationId, orgId))
    .groupBy(products.id);
};

export const getProduct = async (id: string, orgId: string) => {
  const [product] = await db
    .select(productSelectFields)
    .from(products)
    .leftJoin(stockLevels, eq(products.id, stockLevels.productId))
    .where(and(eq(products.id, id), eq(products.organizationId, orgId)))
    .groupBy(products.id);

  return product;
};

export const createProduct = async (
  data: CreateProduct & { orgId: string }
) => {
  const formattedData = {
    ...data,
    organizationId: data.orgId,
    price: data.price ? data.price.toString() : undefined,
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
    price: data.price ? data.price.toString() : undefined,
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

export const getProductMovements = async (productId: string, orgId: string) => {
  return await db
    .select()
    .from(movements)
    .where(
      and(
        eq(movements.productId, productId),
        eq(movements.organizationId, orgId)
      )
    )
    .orderBy(movements.createdAt);
};

export const getDashboardMetrics = async (orgId: string) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentMovements = await db
    .select({
      date: sql<string>`DATE(${movements.createdAt})`,
      type: movements.type,
      quantity: movements.quantity,
    })
    .from(movements)
    .where(
      and(
        eq(movements.organizationId, orgId),
        gte(movements.createdAt, thirtyDaysAgo.toISOString()),
        sql`${movements.type} IN ('IN', 'OUT')`
      )
    );

  const activeProducts = await getProducts(orgId);

  return {
    recentMovements,
    activeProducts,
  };
};

export const performStockMovement = async (
  data: CreateMovement & { orgId: string }
) => {
  await db.insert(movements).values({
    organizationId: data.orgId,
    productId: data.productId,
    type: data.type,
    quantity: data.quantity,
    fromWarehouseId: data.fromWarehouseId,
    toWarehouseId: data.toWarehouseId,
    notes: data.notes,
  });

  if (data.toWarehouseId) {
    await db
      .insert(stockLevels)
      .values({
        productId: data.productId,
        warehouseId: data.toWarehouseId,
        quantity: data.quantity,
      })
      .onConflictDoUpdate({
        target: [stockLevels.productId, stockLevels.warehouseId],
        set: { quantity: sql`${stockLevels.quantity} + ${data.quantity}` },
      });
  }

  if (data.fromWarehouseId) {
    await db
      .update(stockLevels)
      .set({ quantity: sql`${stockLevels.quantity} - ${data.quantity}` })
      .where(
        and(
          eq(stockLevels.productId, data.productId),
          eq(stockLevels.warehouseId, data.fromWarehouseId)
        )
      );
  }
};
