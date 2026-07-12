import type { RoleName } from "@workspace/auth/access-control";
import { m } from "@/paraglide/messages.js";

/** Localized display label for a stored role key. */
export function roleMessage(role: RoleName): string {
  switch (role) {
    case "owner":
      return m.role_owner();
    case "admin":
      return m.role_admin();
    case "member":
      return m.role_member();
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
