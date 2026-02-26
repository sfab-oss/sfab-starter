import type { Db } from "@workspace/db-d1";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export function createAuth(
  db: Db,
  options: { secret: string; baseURL: string }
) {
  return betterAuth({
    baseURL: options.baseURL,
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    secret: options.secret,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [tanstackStartCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
