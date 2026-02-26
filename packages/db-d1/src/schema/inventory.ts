import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, timestamps, updatedAt } from "../utils";

export const products = sqliteTable("products", {
  id: id(),
  userId: text("user_id").notNull(),
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
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  location: text("location"),
  ...timestamps,
});

export const stockLevels = sqliteTable("stock_levels", {
  id: id(),
  productId: text("product_id").notNull(),
  warehouseId: text("warehouse_id").notNull(),
  quantity: integer("quantity").default(0).notNull(),
  updatedAt,
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;
export type StockLevel = typeof stockLevels.$inferSelect;
export type NewStockLevel = typeof stockLevels.$inferInsert;
