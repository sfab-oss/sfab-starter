ALTER TABLE `customer_credit` ADD `claim_reference` text;--> statement-breakpoint
CREATE UNIQUE INDEX `customer_credit_claim_ref_uniq` ON `customer_credit` (`organization_id`,`claim_reference`);