import { env } from "cloudflare:workers";
import { authOrigin } from "@workspace/auth/mcp-resource";

function parseAllowedOrigins(): Set<string> {
  const origins = new Set<string>();
  try {
    origins.add(authOrigin(env.BETTER_AUTH_URL));
  } catch {
    // BETTER_AUTH_URL is expected to be valid.
  }
  return origins;
}

export function validateConsentRequestOrigin(req: Request): boolean {
  const allowedOrigins = parseAllowedOrigins();
  if (allowedOrigins.size === 0) {
    return false;
  }

  const origin = req.headers.get("Origin");
  if (origin) {
    try {
      return allowedOrigins.has(new URL(origin).origin);
    } catch {
      return false;
    }
  }

  const referer = req.headers.get("Referer");
  if (referer) {
    try {
      return allowedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  return false;
}
