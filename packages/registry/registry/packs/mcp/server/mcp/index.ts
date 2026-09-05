import { env } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/server";
import { mcpToolContext, registerMcpTools } from "@workspace/agent/mcp";
import {
  auth,
  serveMcpAuthServerMetadata,
  verifyJwsAccessToken,
} from "@workspace/auth";
import {
  authOrigin,
  mcpIssuer,
  mcpResource,
} from "@workspace/auth/mcp-resource";
import { resolveMcpGrant } from "@workspace/core/mcp";
import { createMcpHandler } from "agents/mcp/server";
import { checkMcpRequestOrigin } from "./check-mcp-origin";

function resourceMetadataUrl(): string {
  return `${authOriginFromEnv()}/.well-known/oauth-protected-resource/mcp`;
}

function authOriginFromEnv(): string {
  return authOrigin(env.BETTER_AUTH_URL);
}

function challenge(errorCode: string): string {
  return `Bearer error="${errorCode}", resource_metadata="${resourceMetadataUrl()}"`;
}

const errorResponse = (
  status: 401 | 403,
  message: string,
  errorCode: string
): Response =>
  Response.json(
    { jsonrpc: "2.0" as const, error: { code: -32_002, message }, id: null },
    {
      status,
      headers: {
        "WWW-Authenticate": challenge(errorCode),
        "Access-Control-Expose-Headers": "WWW-Authenticate",
      },
    }
  );

const jwksCacheKey = {};

// String jwksUrl would betterFetch /api/auth/jwks; Cloudflare same-zone
// loopback fails ("Jwks failed" → 500). Read keys in-process instead.
const fetchJwks = () => auth.api.getJwks();

function corsHeaders(request: Request): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, MCP-Protocol-Version, mcp-session-id"
  );
  headers.set("Access-Control-Expose-Headers", "WWW-Authenticate");
  return headers;
}

export function mcpProtectedResourceMetadata(origin: string): Response {
  const resource = mcpResource(origin);
  return Response.json(
    {
      resource,
      authorization_servers: [mcpIssuer(origin)],
      bearer_methods_supported: ["header"],
    },
    { headers: { "Content-Type": "application/json" } }
  );
}

export async function mcpFetch(
  request: Request,
  envBindings: unknown,
  ctx: ExecutionContext
): Promise<Response> {
  if (request.method === "GET") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "POST, OPTIONS" },
    });
  }

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "POST, OPTIONS" },
    });
  }

  const originCheck = checkMcpRequestOrigin(request);
  if (!originCheck.ok) {
    return errorResponse(
      originCheck.status,
      originCheck.status === 401
        ? "Unauthorized: missing Origin"
        : "Forbidden: foreign Origin",
      originCheck.status === 401 ? "invalid_token" : "insufficient_scope"
    );
  }

  const authorization = request.headers.get("authorization") ?? undefined;
  const accessToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : undefined;
  if (!accessToken) {
    return errorResponse(
      401,
      "Unauthorized: missing bearer token",
      "invalid_token"
    );
  }

  let payload: Awaited<ReturnType<typeof verifyJwsAccessToken>>;
  try {
    payload = await verifyJwsAccessToken(accessToken, {
      jwksFetch: fetchJwks,
      jwksCacheKey,
      verifyOptions: {
        issuer: mcpIssuer(env.BETTER_AUTH_URL),
        audience: mcpResource(env.BETTER_AUTH_URL),
      },
    });
  } catch {
    return errorResponse(
      401,
      "Unauthorized: invalid or expired access token",
      "invalid_token"
    );
  }

  const userId = payload.sub;
  const clientId = (payload.azp ?? payload.client_id) as string | undefined;
  if (!(userId && clientId)) {
    return errorResponse(
      401,
      "Unauthorized: token missing required claims",
      "invalid_token"
    );
  }

  const grant = await resolveMcpGrant({ clientId, userId });
  if (!grant) {
    return errorResponse(
      403,
      "Forbidden: this MCP token has no organization binding, or the user is no longer a member of the bound organization. Re-authorize to bind an org.",
      "insufficient_scope"
    );
  }

  const toolCtx = mcpToolContext(grant, ctx);
  return createMcpHandler(
    () => {
      const server = new McpServer({
        name: "sfab-starter",
        version: "0.0.1",
      });
      registerMcpTools(server, toolCtx);
      return server;
    },
    {
      route: "/mcp",
      legacy: "reject",
      allowedOriginHostnames: "*",
    }
  )(requestWithHost(request), envBindings, ctx);
}

function requestWithHost(request: Request): Request {
  if (request.headers.get("Host")) {
    return request;
  }
  const headers = new Headers(request.headers);
  headers.set("Host", new URL(request.url).host);
  return new Request(request, { headers });
}

export async function dispatchMcpRequest(
  request: Request,
  envBindings: unknown,
  ctx: ExecutionContext
): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/.well-known/oauth-authorization-server") {
    return serveMcpAuthServerMetadata(request);
  }
  if (
    url.pathname === "/.well-known/oauth-protected-resource" ||
    url.pathname === "/.well-known/oauth-protected-resource/mcp"
  ) {
    return mcpProtectedResourceMetadata(env.BETTER_AUTH_URL);
  }
  if (url.pathname === "/mcp") {
    return await mcpFetch(request, envBindings, ctx);
  }
  return null;
}
