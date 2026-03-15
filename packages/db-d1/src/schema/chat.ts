import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { id, timestamps } from "../utils";
import { user } from "./auth";

export const chats = sqliteTable(
  "chats",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    organizationId: text("organization_id").notNull(),
    title: text("title").default("New chat").notNull(),
    agentId: text("agent_id").notNull().default("general-agent"),
    ...timestamps,
  },
  (table) => ({
    userIdIdx: index("chats_user_id_idx").on(table.userId),
    orgIdIdx: index("chats_organization_id_idx").on(table.organizationId),
  })
);

export const messages = sqliteTable("messages", {
  id: id("id", "ulid"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  chatId: text("chat_id")
    .notNull()
    .references(() => chats.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: text("parts", { mode: "json" }).notNull(),
  metadata: text("metadata", { mode: "json" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
