import { env } from "cloudflare:workers";
import { authOrigin } from "@workspace/auth/mcp-resource";

function allowedMcpOrigin(): string {
  return authOrigin(env.BETTER_AUTH_URL);
}

export type McpOriginCheck = { ok: true } | { ok: false; status: 401 | 403 };

export function checkMcpRequestOrigin(request: Request): McpOriginCheck {
  const originHeader = request.headers.get("Origin");
  if (!originHeader) {
    return { ok: false, status: 401 };
  }
  try {
    if (new URL(originHeader).origin !== allowedMcpOrigin()) {
      return { ok: false, status: 403 };
    }
  } catch {
    return { ok: false, status: 403 };
  }
  return { ok: true };
}
