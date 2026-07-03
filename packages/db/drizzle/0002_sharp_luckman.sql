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