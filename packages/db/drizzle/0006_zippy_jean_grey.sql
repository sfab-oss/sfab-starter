CREATE TABLE `customer_credit` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`entity_id` text,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`payment_id` text,
	`reference` text,
	`notes` text,
	`metadata` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_credit_org_entity_idx` ON `customer_credit` (`organization_id`,`entity_id`);--> statement-breakpoint
CREATE INDEX `customer_credit_org_payment_idx` ON `customer_credit` (`organization_id`,`payment_id`);--> statement-breakpoint
CREATE INDEX `customer_credit_org_reference_idx` ON `customer_credit` (`organization_id`,`reference`);--> statement-breakpoint
ALTER TABLE `entities` ADD `credit_balance` integer DEFAULT 0 NOT NULL;