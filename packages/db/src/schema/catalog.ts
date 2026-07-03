import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, moneyMinor, timestamps } from "../utils";

export const products = sqliteTable("products", {
  id: id(),
  organizationId: text("organization_id").notNull(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: moneyMinor("price").default(0),
  cost: moneyMinor("cost").default(0),
  minStockLevel: integer("min_stock_level").default(5),
  imageUrl: text("image_url"),
  ...timestamps,
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
