import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { dbEnv } from "./env";
// biome-ignore lint/performance/noNamespaceImport: This is a schema export
import * as schema from "./schema";

const pool = new Pool({
  connectionString: dbEnv.POSTGRES_URL,
});

export const db = drizzle(pool, { schema });
