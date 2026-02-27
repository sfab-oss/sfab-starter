import type {
  CreateWarehouse,
  UpdateWarehouse,
} from "@workspace/types/warehouses";
import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { warehouses } from "../schema/inventory";

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
