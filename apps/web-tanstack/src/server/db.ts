import { env } from "cloudflare:workers";
import { createDb, type Db } from "@workspace/db-d1";

export const db: Db = createDb(env.DB, true);
