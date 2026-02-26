import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

export const todos = sqliteTable("todos", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  text: text("text").notNull(),
  completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
