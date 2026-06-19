import { customType, text } from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";
import { monotonicFactory } from "ulidx";

const ulid = monotonicFactory();

type IdStrategy = "nanoid" | "ulid";

export const createId = (prefix?: string, strategy: IdStrategy = "nanoid") => {
  const raw = strategy === "ulid" ? ulid() : nanoid();
  if (!prefix) {
    return raw;
  }
  return `${prefix}_${raw}`;
};

export const id = (name = "id", strategy: IdStrategy = "nanoid") =>
  text(name)
    .notNull()
    .primaryKey()
    .$defaultFn(() => createId(undefined, strategy));

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

export const money = customType<{ data: number; driverData: string }>({
  dataType() {
    return "numeric";
  },
  fromDriver(value) {
    return Number(value);
  },
  toDriver(value) {
    return String(value);
  },
});
