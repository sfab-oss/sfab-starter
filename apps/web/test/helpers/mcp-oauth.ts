import { SELF } from "cloudflare:test";
import { mcpResource } from "@workspace/auth/mcp-resource";
import { ORIGIN } from "./auth";

const REDIRECT_URI = "http://127.0.0.1/callback";
const RESOURCE = mcpResource(ORIGIN);
const MCP_PROTOCOL_VERSION = "2026-07-28";
const BASE64URL_PAD = /[=]+$/;
const LEADING_QUESTION = /^\?/;

function withMcpEnvelope(body: object): object {
  const record = body as Record<string, unknown>;
  const params =
    record.params &&
    typeof record.params === "object" &&
    !Array.isArray(record.params)
      ? (record.params as Record<string, unknown>)
      : {};
  const existingMeta =
    params._meta &&
    typeof params._meta === "object" &&
    !Array.isArray(params._meta)
      ? (params._meta as Record<string, unknown>)
      : {};
  return {
    ...record,
    params: {
      ...params,
      _meta: {
        "io.modelcontextprotocol/protocolVersion": MCP_PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientCapabilities": {},
        ...existingMeta,
      },
    },
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(BASE64URL_PAD, "");
}

async function pkce(): Promise<{ challenge: string; verifier: string }> {
  const verifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return { verifier, challenge: toBase64Url(new Uint8Array(digest)) };
}

function cookieHeader(cookie: string): Record<string, string> {
  return {
    Cookie: cookie,
    Origin: ORIGIN,
  };
}

export async function registerPublicClient(): Promise<{ clientId: string }> {
  const res = await SELF.fetch(`${ORIGIN}/api/auth/oauth2/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
    },
    body: JSON.stringify({
      client_name: "vitest-mcp",
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
      application_type: "native",
    }),
  });
  if (!res.ok) {
    throw new Error(`DCR failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { client_id?: string };
  if (!body.client_id) {
    throw new Error(`DCR response missing client_id: ${JSON.stringify(body)}`);
  }
  return { clientId: body.client_id };
}

function restoreSignedOAuthQuery(rawSearch: string): string {
  const params = new URLSearchParams(rawSearch);
  const baParam = params.get("ba_param");
  if (!baParam?.startsWith("[")) {
    return params.toString();
  }
  let names: unknown;
  try {
    names = JSON.parse(baParam);
  } catch {
    return params.toString();
  }
  if (!Array.isArray(names)) {
    return params.toString();
  }
  params.delete("ba_param");
  for (const name of names) {
    if (typeof name === "string") {
      params.append("ba_param", name);
    }
  }
  return params.toString();
}

async function authorizeForConsent(
  cookie: string,
  clientId: string,
  challenge: string
): Promise<string> {
  const url = new URL(`${ORIGIN}/api/auth/oauth2/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", crypto.randomUUID());
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("resource", RESOURCE);

  const res = await SELF.fetch(url.toString(), {
    headers: cookieHeader(cookie),
    redirect: "manual",
  });
  const location = res.headers.get("Location");
  if (!location) {
    throw new Error(
      `Authorize expected redirect (${res.status}): ${await res.text()}`
    );
  }
  const consentUrl = new URL(location, ORIGIN);
  if (!consentUrl.pathname.endsWith("/mcp/consent")) {
    throw new Error(`Authorize redirected to ${consentUrl.toString()}`);
  }
  return restoreSignedOAuthQuery(
    consentUrl.search.replace(LEADING_QUESTION, "")
  );
}

async function consentAndCode(
  cookie: string,
  oauthQuery: string,
  organizationId: string
): Promise<string> {
  const res = await SELF.fetch(`${ORIGIN}/api/mcp/consent`, {
    method: "POST",
    headers: {
      ...cookieHeader(cookie),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      oauth_query: oauthQuery,
      organizationId,
      accept: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`Consent failed (${res.status}): ${await res.text()}`);
  }
  const payload = (await res.json()) as { url?: string };
  if (!payload.url) {
    throw new Error(`Consent missing url: ${JSON.stringify(payload)}`);
  }
  const redirected = new URL(payload.url);
  const code = redirected.searchParams.get("code");
  if (!code) {
    throw new Error(`Consent redirect missing code: ${payload.url}`);
  }
  return code;
}

async function exchangeCode(
  clientId: string,
  code: string,
  verifier: string
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: verifier,
    resource: RESOURCE,
  });
  const res = await SELF.fetch(`${ORIGIN}/api/auth/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: ORIGIN,
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Token failed (${res.status}): ${await res.text()}`);
  }
  const payload = (await res.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error(`Token missing access_token: ${JSON.stringify(payload)}`);
  }
  return payload.access_token;
}

export async function mintMcpAccessToken(params: {
  cookie: string;
  organizationId: string;
}): Promise<{ accessToken: string; clientId: string }> {
  const { clientId } = await registerPublicClient();
  const { challenge, verifier } = await pkce();
  const oauthQuery = await authorizeForConsent(
    params.cookie,
    clientId,
    challenge
  );
  const code = await consentAndCode(
    params.cookie,
    oauthQuery,
    params.organizationId
  );
  const accessToken = await exchangeCode(clientId, code, verifier);
  return { accessToken, clientId };
}

export function mcpRpc(
  accessToken: string,
  body: object,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const record = body as Record<string, unknown>;
  const params =
    record.params &&
    typeof record.params === "object" &&
    !Array.isArray(record.params)
      ? (record.params as Record<string, unknown>)
      : {};
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Origin: ORIGIN,
    Host: new URL(ORIGIN).host,
    "MCP-Protocol-Version": MCP_PROTOCOL_VERSION,
    "Mcp-Method": String(record.method ?? ""),
  };
  if (typeof params.name === "string") {
    headers["Mcp-Name"] = params.name;
  }
  return SELF.fetch(`${ORIGIN}/mcp`, {
    method: "POST",
    headers: {
      ...headers,
      ...extraHeaders,
    },
    body: JSON.stringify(withMcpEnvelope(body)),
  });
}

export async function readMcpJson(res: Response): Promise<unknown> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (contentType.includes("text/event-stream")) {
    for (const block of text.split("\n\n")) {
      for (const line of block.split("\n")) {
        if (line.startsWith("data: ")) {
          return JSON.parse(line.slice(6));
        }
      }
    }
    throw new Error(`No SSE data in MCP response: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text) as unknown;
}
