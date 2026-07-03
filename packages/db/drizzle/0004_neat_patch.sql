CREATE TABLE `entities` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text DEFAULT 'customer' NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`credit_limit` integer,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `entities_org_type_idx` ON `entities` (`organization_id`,`type`);--> statement-breakpoint
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
CREATE UNIQUE INDEX `payments_org_reverses_uniq` ON `payments` (`organization_id`,`reverses_payment_id`);