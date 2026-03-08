import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@workspace/auth";
import { db, getUserOrganization } from "@workspace/db-d1";
import { AppLayout } from "@workspace/ui/components/brand/app-layout";
import { AppSidebar } from "../components/layout/app-sidebar";

const ensureOrg = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return { session: null, needsLogin: true, needsOnboarding: false };
  }

  if (!session.session.activeOrganizationId) {
    const membership = await getUserOrganization(
      { userId: session.user.id },
      db
    );

    if (!membership) {
      return { session, needsLogin: false, needsOnboarding: true };
    }

    await auth.api.setActiveOrganization({
      headers,
      body: { organizationId: membership.organizationId },
    });
  }

  return { session, needsLogin: false, needsOnboarding: false };
});

export const Route = createFileRoute("/_protected")({
  beforeLoad: async ({ location }) => {
    const result = await ensureOrg();

    if (!result.session || result.needsLogin) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }

    if (result.needsOnboarding) {
      throw redirect({
        to: "/onboarding",
      });
    }

    return { user: result.session.user };
  },
  component: () => (
    <AppLayout sidebar={<AppSidebar />}>
      <Outlet />
    </AppLayout>
  ),
});
