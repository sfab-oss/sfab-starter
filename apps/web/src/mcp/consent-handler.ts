import { auth } from "@workspace/auth";
import {
  getOAuthClientDisplay,
  isOrganizationMember,
  oauthClientExists,
  organizationExists,
  upsertMcpOrganizationGrant,
} from "@workspace/core/mcp";
import { z } from "zod";
import { validateConsentRequestOrigin } from "./validate-consent-origin";

const consentBodySchema = z.object({
  oauth_query: z.string().min(1),
  organizationId: z.string().min(1),
  accept: z.boolean(),
});

type ConsentOutcome =
  | { ok: true; payload: unknown }
  | { ok: false; response: Response };

async function runOauth2Consent(
  oauthQuery: string,
  accept: boolean,
  req: Request
): Promise<ConsentOutcome> {
  try {
    const payload = await auth.api.oauth2Consent({
      body: { accept, oauth_query: oauthQuery },
      headers: req.headers,
      request: req,
      asResponse: false,
    });
    return { ok: true, payload };
  } catch (err) {
    const apiErr = err as {
      statusCode?: number;
      status?: string | number;
      body?: { error?: string; error_description?: string; message?: string };
      message?: string;
    };
    const detail =
      apiErr.body?.error_description ??
      apiErr.body?.error ??
      apiErr.body?.message ??
      apiErr.message ??
      "Consent failed";
    const status =
      typeof apiErr.statusCode === "number" ? apiErr.statusCode : 400;
    return {
      ok: false,
      response: Response.json({ error: detail }, { status }),
    };
  }
}

export async function handleMcpConsentClient(req: Request): Promise<Response> {
  const sameSite = req.headers.get("Sec-Fetch-Site") === "same-origin";
  if (!(validateConsentRequestOrigin(req) || sameSite)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const clientId = new URL(req.url).searchParams.get("client_id")?.trim();
  if (!clientId) {
    return Response.json({ error: "Missing client_id" }, { status: 400 });
  }

  const client = await getOAuthClientDisplay(clientId);
  if (!client) {
    return Response.json({ error: "Unknown OAuth client" }, { status: 404 });
  }

  return Response.json({
    clientId: client.clientId,
    name: client.name,
    icon: client.icon,
  });
}

export async function handleMcpConsent(req: Request): Promise<Response> {
  if (!validateConsentRequestOrigin(req)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: z.infer<typeof consentBodySchema>;
  try {
    body = consentBodySchema.parse(await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const clientId = new URLSearchParams(body.oauth_query).get("client_id");
  if (!clientId) {
    return Response.json(
      { error: "Missing client_id in oauth_query" },
      { status: 400 }
    );
  }

  if (!body.accept) {
    const denied = await runOauth2Consent(body.oauth_query, false, req);
    return denied.ok ? Response.json(denied.payload) : denied.response;
  }

  if (
    !(await isOrganizationMember({
      userId: session.user.id,
      organizationId: body.organizationId,
    }))
  ) {
    return Response.json(
      { error: "Not a member of the requested organization" },
      { status: 403 }
    );
  }

  if (!(await oauthClientExists(clientId))) {
    return Response.json({ error: "Unknown OAuth client" }, { status: 400 });
  }

  if (!(await organizationExists(body.organizationId))) {
    return Response.json({ error: "Organization not found" }, { status: 404 });
  }

  const accepted = await runOauth2Consent(body.oauth_query, true, req);
  if (!accepted.ok) {
    return accepted.response;
  }

  await upsertMcpOrganizationGrant({
    clientId,
    userId: session.user.id,
    organizationId: body.organizationId,
  });

  return Response.json(accepted.payload);
}
