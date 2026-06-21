import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { ac, roles } from "./access-control";

export const authClient = createAuthClient({
  baseURL: typeof window === "undefined" ? "" : window.location.origin,
  // Same `ac`/`roles` as the server so `authClient.organization.checkRolePermission`
  // and the shared `can()` agree. See packages/auth/src/access-control.ts.
  plugins: [organizationClient({ ac, roles })],
});

export type Session = typeof authClient.$Infer.Session;
