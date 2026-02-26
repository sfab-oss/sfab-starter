import { env } from "cloudflare:workers";
import { createAuth } from "@workspace/auth";
import { db } from "./db";

export const auth = createAuth(db, { baseURL: env.BETTER_AUTH_URL });
