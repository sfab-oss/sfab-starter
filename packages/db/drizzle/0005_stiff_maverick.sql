DROP INDEX `payments_org_reverses_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `payments_org_reverses_uniq` ON `payments` (`organization_id`,`reverses_payment_id`);