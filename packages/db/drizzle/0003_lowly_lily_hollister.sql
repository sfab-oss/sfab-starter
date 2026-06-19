DROP TABLE `chats`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_products` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` numeric DEFAULT 0,
	`cost` numeric DEFAULT 0,
	`min_stock_level` integer DEFAULT 5,
	`image_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_products`("id", "organization_id", "sku", "name", "description", "price", "cost", "min_stock_level", "image_url", "created_at", "updated_at") SELECT "id", "organization_id", "sku", "name", "description", "price", "cost", "min_stock_level", "image_url", "created_at", "updated_at" FROM `products`;--> statement-breakpoint
DROP TABLE `products`;--> statement-breakpoint
ALTER TABLE `__new_products` RENAME TO `products`;--> statement-breakpoint
PRAGMA foreign_keys=ON;