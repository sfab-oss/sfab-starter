import type { Db } from "@workspace/db-d1";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { authEnv } from "./env";

export function createAuth(db: Db, options: { baseURL: string }) {
  return betterAuth({
    baseURL: options.baseURL,
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    secret: authEnv.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [tanstackStartCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
