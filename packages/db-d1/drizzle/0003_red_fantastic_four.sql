ALTER TABLE `chats` ADD `parent_chat_id` text;--> statement-breakpoint
ALTER TABLE `chats` ADD `parent_tool_call_id` text;--> statement-breakpoint
CREATE INDEX `chats_parent_chat_id_idx` ON `chats` (`parent_chat_id`);