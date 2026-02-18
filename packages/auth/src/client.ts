import { BASE_URL } from "@workspace/config";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: BASE_URL,
});

export type Session = typeof authClient.$Infer.Session;
