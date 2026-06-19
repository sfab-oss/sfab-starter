import { customType, text } from "drizzle-orm/sqlite-core";
import { monotonicFactory } from "ulidx";

// IDs are ULIDs: 26-char, lexicographically sortable (the timestamp is encoded
// in the id). The monotonic factory keeps ids created within the same
// millisecond in creation order. Sortable primary keys give rows natural
// time-ordering, better index locality on inserts, and let you paginate/sort by
// id without a separate timestamp column.
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

// Money as a plain number backed by a SQLite `numeric` column. This is a
// deliberately simple default for the template (it mirrors the prior
// text-backed price and keeps the example readable). It is float-backed, so a
// production app handling currency may want integer cents or a decimal library
// to avoid floating-point rounding on arithmetic like `quantity * price`.
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
