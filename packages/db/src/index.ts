import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
// biome-ignore lint/performance/noNamespaceImport: This is a schema export
import * as schema from "./schema";

export const db = drizzle(env.DB, { schema });

export type Db = typeof db;

// biome-ignore lint/performance/noBarrelFile: This is a schema export
export * from "./schema";
