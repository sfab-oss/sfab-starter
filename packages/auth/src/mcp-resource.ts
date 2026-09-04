const TRAILING_SLASHES = /\/+$/;

export function authOrigin(baseUrl: string | undefined): string {
  if (!baseUrl) {
    throw new Error("BETTER_AUTH_URL is not set");
  }
  return baseUrl.replace(TRAILING_SLASHES, "");
}

export function mcpIssuer(baseUrl: string): string {
  return `${authOrigin(baseUrl)}/api/auth`;
}

export function mcpResource(baseUrl: string): string {
  return `${authOrigin(baseUrl)}/mcp`;
}

export function defaultMcpResource(
  path: string | undefined,
  body: unknown,
  resource: string
): Record<string, unknown> | undefined {
  if (path !== "/oauth2/token") {
    return;
  }
  if (!body || typeof body !== "object") {
    return;
  }
  const record = body as Record<string, unknown>;
  if (typeof record.resource === "string" && record.resource.length > 0) {
    return;
  }
  return { ...record, resource };
}
