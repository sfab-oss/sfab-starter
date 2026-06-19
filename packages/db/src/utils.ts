import { customType, text } from "drizzle-orm/sqlite-core";
import { monotonicFactory } from "ulidx";

const ulid = monotonicFactory();

export const createId = (prefix?: string) => {
  const raw = ulid();
  if (!prefix) {
    return raw;
  }
  return `${prefix}_${raw}`;
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

// Float-backed numeric — production currency may want integer cents or a decimal library.
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
