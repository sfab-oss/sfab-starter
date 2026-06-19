import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

function getLocalD1DB(): string {
  const basePath = path.resolve(
    import.meta.dirname,
    "../../apps/web/.wrangler/state/v3/d1"
  );
  try {
    const files = fs.readdirSync(basePath, {
      recursive: true,
      encoding: "utf-8",
    });
    const dbFile = files.find(
      (f) => typeof f === "string" && f.endsWith(".sqlite")
    );
    if (dbFile) {
      return path.resolve(basePath, dbFile);
    }
  } catch {
    /* local D1 state not present */
  }
  return ":memory:";
}

export default defineConfig({
  schema: "./src/schema/*",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: getLocalD1DB(),
  },
});
