import { customAlphabet } from "nanoid";

export const createId = (prefix?: string) => {
  const nanoid = customAlphabet(
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    16
  );
  return `${prefix ? `${prefix}_` : ""}${nanoid()}`;
};
