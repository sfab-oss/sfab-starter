import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { createdAt, id, timestamps, updatedAt } from "../utils";

export const products = sqliteTable("products", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price").default("0"),
  cost: text("cost").default("0"),
  minStockLevel: integer("min_stock_level").default(5),
  imageUrl: text("image_url"),
  ...timestamps,
});

export const warehouses = sqliteTable("warehouses", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  name: text("name").notNull(),
  location: text("location"),
  isDefault: integer("is_default", { mode: "boolean" })
    .default(false)
    .notNull(),
  createdAt,
});

export const stockLevels = sqliteTable(
  "stock_levels",
  {
    id: id(),
    productId: text("product_id").notNull(),
    warehouseId: text("warehouse_id").notNull(),
    quantity: integer("quantity").default(0).notNull(),
    updatedAt,
  },
  (table) => [
    uniqueIndex("stock_levels_product_warehouse").on(
      table.productId,
      table.warehouseId
    ),
  ]
);

export const movements = sqliteTable("movements", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  productId: text("product_id").notNull(),
  fromWarehouseId: text("from_warehouse_id"),
  toWarehouseId: text("to_warehouse_id"),
  type: text("type", {
    enum: ["IN", "OUT", "TRANSFER", "ADJUSTMENT"],
  }).notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  createdAt,
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
export type StockLevel = typeof stockLevels.$inferSelect;
export type NewStockLevel = typeof stockLevels.$inferInsert;
export type Movement = typeof movements.$inferSelect;
export type NewMovement = typeof movements.$inferInsert;
