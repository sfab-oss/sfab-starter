import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
// biome-ignore lint/performance/noNamespaceImport: This is a schema export
import * as schema from "./schema";

export const db = drizzle(env.DB, { schema });

export type Db = typeof db;

// Re-export the query-building operators so consumers (core + tests) build
// queries against the db without each declaring drizzle-orm directly.
export {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm";
export * from "./schema";
export { createId } from "./utils";
