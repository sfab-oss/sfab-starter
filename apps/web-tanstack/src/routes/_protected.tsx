import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@workspace/auth";
import { getUserOrganization } from "@workspace/core/auth";
import { db } from "@workspace/db-d1";
import { AppLayout } from "@workspace/ui/components/brand/app-layout";
import { Button } from "@workspace/ui/components/shadcn/button";
import { AlertCircle } from "lucide-react";
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

function ProtectedErrorComponent({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <AppLayout sidebar={<AppSidebar />}>
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="font-semibold text-xl">Something went wrong</h2>
        <p className="max-w-md text-center text-muted-foreground">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred"}
        </p>
        <div className="flex gap-2">
          <Button onClick={() => reset()} variant="outline">
            Try Again
          </Button>
          <Button onClick={() => router.navigate({ to: "/" })}>Go Home</Button>
        </div>
      </div>
    </AppLayout>
  );
}

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
  errorComponent: ProtectedErrorComponent,
});
