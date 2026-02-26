import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
// biome-ignore lint/performance/noNamespaceImport: This is a schema export
import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

export function createDb(d1: D1Database, logger = false) {
  return drizzle(d1, { schema, logger });
}

// biome-ignore lint/performance/noBarrelFile: This is a schema export
export * from "./schema";
