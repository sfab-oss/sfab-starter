CREATE TABLE `activity_log` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`kind` text NOT NULL,
	`event_type` text,
	`entity_type` text,
	`entity_id` text,
	`actor_id` text,
	`summary` text,
	`metadata` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `activity_org_entity_idx` ON `activity_log` (`organization_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `activity_org_event_idx` ON `activity_log` (`organization_id`,`event_type`);--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`expires_at` integer NOT NULL,
	`inviter_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `invitation_organizationId_idx` ON `invitation` (`organization_id`);--> statement-breakpoint
CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);--> statement-breakpoint
CREATE TABLE `member` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `member_organizationId_idx` ON `member` (`organization_id`);--> statement-breakpoint
CREATE INDEX `member_userId_idx` ON `member` (`user_id`);--> statement-breakpoint
CREATE TABLE `organization` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`metadata` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organization_slug_unique` ON `organization` (`slug`);--> statement-breakpoint
CREATE INDEX `organization_slug_idx` ON `organization` (`slug`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`active_organization_id` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`active_organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` integer DEFAULT 0 NOT NULL,
	`cost` integer DEFAULT 0 NOT NULL,
	`min_stock_level` integer DEFAULT 5,
	`image_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customer_credit` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`entity_id` text,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`payment_id` text,
	`reference` text,
	`claim_reference` text,
	`notes` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_credit_org_entity_idx` ON `customer_credit` (`organization_id`,`entity_id`);--> statement-breakpoint
CREATE INDEX `customer_credit_org_payment_idx` ON `customer_credit` (`organization_id`,`payment_id`);--> statement-breakpoint
CREATE INDEX `customer_credit_org_reference_idx` ON `customer_credit` (`organization_id`,`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `customer_credit_claim_ref_uniq` ON `customer_credit` (`organization_id`,`claim_reference`);--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`type` text NOT NULL,
	`family` text NOT NULL,
	`direction` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`entity_id` text,
	`entity_name` text,
	`currency_code` text DEFAULT 'USD' NOT NULL,
	`subtotal` integer DEFAULT 0 NOT NULL,
	`discount_total` integer DEFAULT 0 NOT NULL,
	`tax_total` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`amount_paid` integer DEFAULT 0 NOT NULL,
	`balance_due` integer DEFAULT 0 NOT NULL,
	`payment_status` text DEFAULT 'unpaid' NOT NULL,
	`series` text,
	`folio` integer,
	`issued_at` text,
	`posting_date` text,
	`voided_at` text,
	`source_document_id` text,
	`root_document_id` text,
	`reverses_document_id` text,
	`settlement_status` text DEFAULT 'active' NOT NULL,
	`last_applied_payment_id` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "documents_family_type_check" CHECK((type = 'quote' AND family = 'commercial' OR type = 'sales_order' AND family = 'commercial' OR type = 'purchase_order' AND family = 'commercial' OR type = 'invoice' AND family = 'fiscal' OR type = 'credit_note' AND family = 'fiscal' OR type = 'receipt' AND family = 'fiscal' OR type = 'bill' AND family = 'fiscal' OR type = 'goods_receipt' AND family = 'stock' OR type = 'adjustment' AND family = 'stock' OR type = 'transfer' AND family = 'stock'))
);
--> statement-breakpoint
CREATE INDEX `documents_org_type_idx` ON `documents` (`organization_id`,`type`);--> statement-breakpoint
CREATE INDEX `documents_org_status_idx` ON `documents` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX `documents_org_entity_idx` ON `documents` (`organization_id`,`entity_id`);--> statement-breakpoint
CREATE INDEX `documents_org_folio_idx` ON `documents` (`organization_id`,`series`,`folio`);--> statement-breakpoint
CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'customer' NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`credit_balance` integer DEFAULT 0 NOT NULL,
	`credit_limit` integer,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entities_org_type_idx` ON `entities` (`organization_id`,`type`);--> statement-breakpoint
CREATE TABLE `line_items` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`document_id` text NOT NULL,
	`product_id` text,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_price` integer DEFAULT 0 NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`tax_rate` integer DEFAULT 0 NOT NULL,
	`tax_code` text,
	`tax_mode` text DEFAULT 'exclusive' NOT NULL,
	`tax_amount` integer DEFAULT 0 NOT NULL,
	`taxable_base` integer DEFAULT 0 NOT NULL,
	`fulfillment_mode` text DEFAULT 'none' NOT NULL,
	`warehouse_id` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `line_items_org_document_idx` ON `line_items` (`organization_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `line_items_org_product_idx` ON `line_items` (`organization_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `payment_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`document_id` text NOT NULL,
	`amount` integer NOT NULL,
	`effective_at` text NOT NULL,
	`reversed_at` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pmt_alloc_org_pmt_doc_uniq` ON `payment_allocations` (`organization_id`,`payment_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `pmt_alloc_org_doc_idx` ON `payment_allocations` (`organization_id`,`document_id`);--> statement-breakpoint
CREATE INDEX `pmt_alloc_org_pmt_idx` ON `payment_allocations` (`organization_id`,`payment_id`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`amount` integer NOT NULL,
	`method` text NOT NULL,
	`paid_at` text NOT NULL,
	`reference` text,
	`idempotency_key` text,
	`reverses_payment_id` text,
	`entity_id` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_org_idem_uniq` ON `payments` (`organization_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `payments_org_entity_idx` ON `payments` (`organization_id`,`entity_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_org_reverses_uniq` ON `payments` (`organization_id`,`reverses_payment_id`);--> statement-breakpoint
CREATE TABLE `sequences` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`key` text NOT NULL,
	`next` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sequences_org_key_uniq` ON `sequences` (`organization_id`,`key`);