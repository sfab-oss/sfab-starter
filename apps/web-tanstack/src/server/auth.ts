import { env } from "cloudflare:workers";
import { createAuth } from "@workspace/auth";
import { db } from "./db";

export const auth = createAuth(db, {
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});
