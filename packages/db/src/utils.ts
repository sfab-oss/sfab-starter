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

// Integer minor units — the smallest currency unit (cents, centavos). Replaces
// the float `numeric → number` placeholder per ADR-006; floats never touch money.
// Math lives in `@workspace/core/money`; formatting in `@workspace/ui/lib/money`.
export const moneyMinor = customType<{ data: number; driverData: number }>({
  dataType() {
    return "integer";
  },
  fromDriver(value) {
    return Number(value);
  },
  toDriver(value) {
    return value;
  },
});
