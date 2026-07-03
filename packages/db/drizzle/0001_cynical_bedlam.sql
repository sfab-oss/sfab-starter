-- products: numeric -> integer minor units (ADR-006). drizzle emits a
-- table-recreate; on D1 `PRAGMA foreign_keys=OFF` is a no-op (implicit txn),
-- so use `defer_foreign_keys=true` (ADR-007). No value transform: this is a
-- fresh-DB-only template migration (`pnpm db:reset` wipes local data; new
-- projects start clean) — the integer minor-unit convention begins here.
PRAGMA defer_foreign_keys=true;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer DEFAULT 0,
	`cost` integer DEFAULT 0,
	`min_stock_level` integer DEFAULT 5,
	`image_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "organization_id", "sku", "name", "description", "price", "cost", "min_stock_level", "image_url", "created_at", "updated_at") SELECT "id", "organization_id", "sku", "name", "description", "price", "cost", "min_stock_level", "image_url", "created_at", "updated_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
-- (trailing PRAGMA foreign_keys=ON removed — paired with the defer swap above, ADR-007)