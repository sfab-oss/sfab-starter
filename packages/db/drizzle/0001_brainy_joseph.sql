ALTER TABLE "chats" ADD COLUMN "agent_id" text DEFAULT 'general-agent' NOT NULL;--> statement-breakpoint
CREATE INDEX "chats_user_id_idx" ON "chats" USING btree ("user_id");