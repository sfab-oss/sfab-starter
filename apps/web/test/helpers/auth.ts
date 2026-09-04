import { SELF } from "cloudflare:test";

// Must match BETTER_AUTH_URL in .dev.vars for CSRF validation
export const ORIGIN = "http://localhost:4011";

/**
 * Helper to make POST requests with the Origin header required by Better Auth CSRF protection.
 */
function authPost(url: string, body: object, cookie?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: ORIGIN,
  };
  if (cookie) {
    headers.Cookie = cookie;
  }
  return SELF.fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    redirect: "manual",
  });
}

/**
 * Creates a test user via Better Auth's signup endpoint and returns the session cookie.
 * This goes through the real auth flow so cookies are properly signed.
 */
export async function createTestSession(overrides?: {
  name?: string;
  email?: string;
  password?: string;
}) {
  const id = crypto.randomUUID();
  const name = overrides?.name ?? "Test User";
  const email = overrides?.email ?? `${id}@test.com`;
  const password = overrides?.password ?? "test-password-123";

  const res = await authPost(`${ORIGIN}/api/auth/sign-up/email`, {
    name,
    email,
    password,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Signup failed (${res.status}): ${text}`);
  }

  const cookies = res.headers.getSetCookie();
  const sessionCookie = cookies.find((c) =>
    c.startsWith("better-auth.session_token=")
  );

  if (!sessionCookie) {
    throw new Error("No session cookie returned from signup");
  }

  // Extract just the cookie key=value part (before the first ;)
  const cookieValue = sessionCookie.split(";")[0];

  const body = (await res.json()) as { user: { id: string } };

  return { cookie: cookieValue, userId: body.user.id, email };
}

/**
 * Creates a test session with an active organization.
 * Signs up, creates an org, then returns the session cookie.
 */
export async function createTestSessionWithOrg(overrides?: {
  name?: string;
  email?: string;
  orgName?: string;
}) {
  const { cookie, userId, email } = await createTestSession(overrides);

  const orgName = overrides?.orgName ?? "Test Org";
  const orgSlug = `test-org-${crypto.randomUUID().slice(0, 8)}`;

  // Create organization via Better Auth API
  const orgRes = await authPost(
    `${ORIGIN}/api/auth/organization/create`,
    { name: orgName, slug: orgSlug },
    cookie
  );

  if (!orgRes.ok) {
    const text = await orgRes.text();
    throw new Error(`Create org failed (${orgRes.status}): ${text}`);
  }

  const orgBody = (await orgRes.json()) as {
    id?: string;
    organization?: { id?: string };
  };
  const orgId = orgBody.id ?? orgBody.organization?.id;
  if (!orgId) {
    throw new Error(
      `Create org did not return an id: ${JSON.stringify(orgBody)}`
    );
  }

  // The session should now have activeOrganizationId set (via the db hook)
  // We need the updated session cookie from the org creation response
  const orgCookies = orgRes.headers.getSetCookie();
  const updatedSessionCookie = orgCookies.find((c) =>
    c.startsWith("better-auth.session_token=")
  );

  // Use the updated cookie if available, otherwise the original
  const finalCookie = updatedSessionCookie
    ? updatedSessionCookie.split(";")[0]
    : cookie;

  // Set active org
  const setActiveRes = await authPost(
    `${ORIGIN}/api/auth/organization/set-active`,
    { organizationSlug: orgSlug },
    finalCookie
  );

  const setActiveCookies = setActiveRes.headers.getSetCookie();
  const activeCookie = setActiveCookies.find((c) =>
    c.startsWith("better-auth.session_token=")
  );

  return {
    cookie: activeCookie ? activeCookie.split(";")[0] : finalCookie,
    userId,
    email,
    orgId,
    orgSlug,
  };
}

export async function createOrgOnSession(
  cookie: string,
  orgName: string
): Promise<{ cookie: string; orgId: string; orgSlug: string }> {
  const orgSlug = `test-org-${crypto.randomUUID().slice(0, 8)}`;
  const orgRes = await authPost(
    `${ORIGIN}/api/auth/organization/create`,
    { name: orgName, slug: orgSlug },
    cookie
  );
  if (!orgRes.ok) {
    const text = await orgRes.text();
    throw new Error(`Create org failed (${orgRes.status}): ${text}`);
  }
  const orgBody = (await orgRes.json()) as {
    id?: string;
    organization?: { id?: string };
  };
  const orgId = orgBody.id ?? orgBody.organization?.id;
  if (!orgId) {
    throw new Error(
      `Create org did not return an id: ${JSON.stringify(orgBody)}`
    );
  }
  const orgCookies = orgRes.headers.getSetCookie();
  const updatedSessionCookie = orgCookies.find((c) =>
    c.startsWith("better-auth.session_token=")
  );
  const nextCookie = updatedSessionCookie
    ? updatedSessionCookie.split(";")[0]
    : cookie;
  return { cookie: nextCookie, orgId, orgSlug };
}
