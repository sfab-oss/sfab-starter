ALTER TABLE `chats` ADD `organization_id` text NOT NULL;--> statement-breakpoint
CREATE INDEX `chats_organization_id_idx` ON `chats` (`organization_id`);