import { text } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

const createId = (prefix?: string) => {
  const id = nanoid();
  if (!prefix) {
    return id;
  }
  return `${prefix}_${id}`;
};

export const id = (name = "id") =>
  text(name)
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId());

export const createdAt = text("created_at")
  .notNull()
  .$defaultFn(() => new Date().toISOString());

export const updatedAt = text("updated_at")
  .notNull()
  .$defaultFn(() => new Date().toISOString())
  .$onUpdate(() => new Date().toISOString());

export const timestamps = {
  createdAt,
  updatedAt,
};
