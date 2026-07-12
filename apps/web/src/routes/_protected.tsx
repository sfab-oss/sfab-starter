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
import { db } from "@workspace/db";
import {
  Shell,
  ShellFooter,
  ShellInset,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import { AlertCircle } from "lucide-react";
import { m } from "@/paraglide/messages.js";
import { ChatDockMount } from "../components/chat/dock/chat-dock-mount";
import { AppSidebar } from "../components/layout/app-sidebar";
import { PageContextProvider } from "../components/providers/page-context";

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
    <Shell sidebar={<AppSidebar />}>
      <ShellInset>
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="font-semibold text-xl">{m.error_page_title()}</h2>
          <p className="max-w-md text-center text-muted-foreground">
            {error instanceof Error ? error.message : m.common_unknown_error()}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => reset()} variant="outline">
              {m.common_retry()}
            </Button>
            <Button onClick={() => router.navigate({ to: "/" })}>
              {m.error_go_home()}
            </Button>
          </div>
        </div>
      </ShellInset>
    </Shell>
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
    <PageContextProvider>
      <Shell sidebar={<AppSidebar />}>
        <ShellInset>
          <Outlet />
        </ShellInset>
        <ShellFooter>
          <ChatDockMount />
        </ShellFooter>
      </Shell>
    </PageContextProvider>
  ),
  errorComponent: ProtectedErrorComponent,
});
