import { customAlphabet } from "nanoid";
import { monotonicFactory } from "ulidx";

const nanoid = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  16
);
const ulid = monotonicFactory();

type IdStrategy = "nanoid" | "ulid";

export const createId = (prefix?: string, strategy: IdStrategy = "nanoid") => {
  const raw = strategy === "ulid" ? ulid() : nanoid();
  return `${prefix ? `${prefix}_` : ""}${raw}`;
};
