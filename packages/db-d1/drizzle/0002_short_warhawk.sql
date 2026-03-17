ALTER TABLE `chats` ADD `status` text DEFAULT 'idle' NOT NULL;--> statement-breakpoint
ALTER TABLE `chats` ADD `last_error` text;