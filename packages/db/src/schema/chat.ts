import type { BaseAIUIMessage } from "@workspace/types/ai";
import { index, pgTable } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const chats = pgTable(
  "chats",
  (t) => ({
    id: t.text("id").primaryKey(),
    userId: t
      .text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: t.text("title").default("New chat").notNull(),

    // NEW: Agent used for this chat
    agentId: t.text("agent_id").notNull().default("general-agent"),
    createdAt: t
      .timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: t
      .timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  }),
  (table) => ({
    userIdIdx: index("chats_user_id_idx").on(table.userId),
  })
);

export const messages = pgTable("messages", (t) => ({
  id: t.text("id").primaryKey(),
  userId: t
    .text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  chatId: t
    .text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: t.jsonb("data").$type<BaseAIUIMessage["role"]>().notNull(),
  parts: t.jsonb("parts").$type<BaseAIUIMessage["parts"]>().notNull(),
  metadata: t.jsonb("metadata").$type<BaseAIUIMessage["metadata"]>().notNull(),
  createdAt: t
    .timestamp("created_at", { mode: "string" })
    .defaultNow()
    .notNull(),
}));
