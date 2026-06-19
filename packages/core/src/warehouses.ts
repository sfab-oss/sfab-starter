import type { PaginationQuery } from "@workspace/contract/pagination";
import type {
  CreateWarehouse,
  UpdateWarehouse,
} from "@workspace/contract/warehouses";
import { db } from "@workspace/db";
import { warehouses } from "@workspace/db/schema";
import { and, asc, desc, eq, like, sql } from "drizzle-orm";
import { buildPaginatedResponse, getPaginationOffsetLimit } from "./pagination";

const warehouseSortColumns = {
  name: warehouses.name,
  location: warehouses.location,
  createdAt: warehouses.createdAt,
} as const;

export const getPaginatedWarehouses = async (
  orgId: string,
  params: PaginationQuery
) => {
  const { offset, limit } = getPaginationOffsetLimit(params);

  const conditions = [eq(warehouses.organizationId, orgId)];
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

export const getWarehouses = async (orgId: string) => {
  return await db
    .select()
    .from(warehouses)
    .where(eq(warehouses.organizationId, orgId))
    .orderBy(warehouses.name);
};

export const getWarehouse = async (id: string, orgId: string) => {
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(and(eq(warehouses.id, id), eq(warehouses.organizationId, orgId)));
  return warehouse;
};

export const getDefaultWarehouse = async (orgId: string) => {
  const [warehouse] = await db
    .select()
    .from(warehouses)
    .where(
      and(eq(warehouses.organizationId, orgId), eq(warehouses.isDefault, true))
    );
  return warehouse;
};

export const createWarehouse = async (
  data: CreateWarehouse & { orgId: string }
) => {
  if (data.isDefault) {
    await db
      .update(warehouses)
      .set({ isDefault: false })
      .where(eq(warehouses.organizationId, data.orgId));
  }
  const [result] = await db
    .insert(warehouses)
    .values({ ...data, organizationId: data.orgId })
    .returning();
  return result;
};

export const updateWarehouse = async (
  id: string,
  orgId: string,
  data: UpdateWarehouse
) => {
  if (data.isDefault) {
    await db
      .update(warehouses)
      .set({ isDefault: false })
      .where(eq(warehouses.organizationId, orgId));
  }
  const [updated] = await db
    .update(warehouses)
    .set(data)
    .where(and(eq(warehouses.id, id), eq(warehouses.organizationId, orgId)))
    .returning();
  return updated;
};

export const deleteWarehouse = async (id: string, orgId: string) => {
  const [deleted] = await db
    .delete(warehouses)
    .where(and(eq(warehouses.id, id), eq(warehouses.organizationId, orgId)))
    .returning();
  return deleted;
};
