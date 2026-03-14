import { db } from "@workspace/db-d1";
import { warehouses } from "@workspace/db-d1/schema";
import type { PaginationQuery } from "@workspace/types/pagination";
import type {
  CreateWarehouse,
  UpdateWarehouse,
} from "@workspace/types/warehouses";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { buildPaginatedResponse, getPaginationOffsetLimit } from "./pagination";

const warehouseSortColumns = {
  name: warehouses.name,
  location: warehouses.location,
  createdAt: warehouses.createdAt,
} as const;

export const getPaginatedWarehouses = async (
  userId: string,
  params: PaginationQuery
) => {
  const { offset, limit } = getPaginationOffsetLimit(params);

  const conditions = [eq(warehouses.userId, userId)];
  if (params.search) {
    conditions.push(like(warehouses.name, `%${params.search}%`));
  }
  const whereClause = and(...conditions);

  const countResult = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(warehouses)
    .where(whereClause);
  const total = countResult[0]?.total ?? 0;

  const sortColumn =
    params.sortBy && params.sortBy in warehouseSortColumns
      ? warehouseSortColumns[params.sortBy as keyof typeof warehouseSortColumns]
      : null;
  const dirFn = params.sortOrder === "desc" ? desc : asc;
  const orderByClause = sortColumn ? dirFn(sortColumn) : asc(warehouses.name);

  const data = await db
    .select()
    .from(warehouses)
    .where(whereClause)
    .orderBy(orderByClause)
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(data, total, params);
};

export const getWarehouses = async (userId: string) => {
  return await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.userId, userId))
    .orderBy(warehouses.name);
};

export const getWarehouse = async (id: string, userId: string) => {
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(and(eq(warehouses.id, id), eq(warehouses.userId, userId)));
  return warehouse;
};

export const getDefaultWarehouse = async (userId: string) => {
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(and(eq(warehouses.userId, userId), eq(warehouses.isDefault, true)));
  return warehouse;
};

export const createWarehouse = async (
  data: CreateWarehouse & { userId: string }
) => {
  if (data.isDefault) {
    await db
      .update(warehouses)
      .set({ isDefault: false })
      .where(eq(warehouses.userId, data.userId));
  }
  const [result] = await db.insert(warehouses).values(data).returning();
  return result;
};

export const updateWarehouse = async (
  id: string,
  userId: string,
  data: UpdateWarehouse
) => {
  if (data.isDefault) {
    await db
      .update(warehouses)
      .set({ isDefault: false })
      .where(eq(warehouses.userId, userId));
  }
  const [updated] = await db
    .update(warehouses)
    .set(data)
    .where(and(eq(warehouses.id, id), eq(warehouses.userId, userId)))
    .returning();
  return updated;
};

export const deleteWarehouse = async (id: string, userId: string) => {
  const [deleted] = await db
    .delete(warehouses)
    .where(and(eq(warehouses.id, id), eq(warehouses.userId, userId)))
    .returning();
  return deleted;
};
