import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/shadcn/avatar";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Label } from "@workspace/ui/components/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/shadcn/select";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { AuthPage } from "@/components/common/auth-page";
import { client } from "@/lib/client";
import { restoreSignedOAuthQuery } from "@/lib/restore-signed-oauth-query";
import { m } from "@/paraglide/messages.js";

const PROTOCOL_SCOPES = new Set([
  "openid",
  "profile",
  "email",
  "offline_access",
]);
const WHITESPACE = /\s+/;

export const Route = createFileRoute("/mcp/consent")({
  validateSearch: (search: Record<string, unknown>) => ({
    client_id: String(search.client_id || ""),
    scope: String(search.scope || ""),
  }),
  component: McpConsentPage,
});

function clientLabel(
  name: string | null | undefined,
  clientId: string
): string {
  const trimmed = name?.trim();
  return trimmed || clientId || m.mcp_consent_title();
}

function initials(name: string): string {
  const parts = name.trim().split(WHITESPACE).filter(Boolean);
  const first = parts[0];
  if (!first) {
    return "?";
  }
  const second = parts[1];
  if (!second) {
    return first.slice(0, 2).toUpperCase();
  }
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

function extraScopes(scope: string): string | null {
  const parts = scope.split(WHITESPACE).filter(Boolean);
  const extra = parts.filter((part) => !PROTOCOL_SCOPES.has(part));
  return extra.length > 0 ? extra.join(" ") : null;
}

interface ConsentClientDisplay {
  clientId: string;
  name: string | null;
  icon: string | null;
}

function useMcpConsentClient(clientId: string) {
  return useQuery({
    queryKey: ["mcp", "consent-client", clientId],
    enabled: clientId.length > 0,
    queryFn: async (): Promise<ConsentClientDisplay | null> => {
      const res = await client.mcp["consent-client"].$get({
        query: { client_id: clientId },
      });
      if (res.status === 404) {
        return null;
      }
      if (!res.ok) {
        throw new Error("Failed to load client");
      }
      return (await res.json()) as ConsentClientDisplay;
    },
  });
}

function McpConsentPage() {
  const { client_id, scope } = Route.useSearch();
  const { data: session, isPending } = authClient.useSession();
  const searchStr = useRouterState({
    select: (s) => s.location.searchStr,
  });
  const oauthQuery = restoreSignedOAuthQuery(
    searchStr.startsWith("?") ? searchStr.slice(1) : searchStr
  );
  const consentClient = useMcpConsentClient(client_id);
  const label = clientLabel(consentClient.data?.name, client_id);

  if (isPending) {
    return (
      <AuthPage>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{m.mcp_consent_title()}</CardTitle>
            <CardDescription>
              {m.mcp_consent_sign_in_description()}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {m.mcp_consent_loading()}
          </CardContent>
        </Card>
      </AuthPage>
    );
  }

  if (!new URLSearchParams(oauthQuery).has("sig")) {
    return (
      <AuthPage>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{m.mcp_consent_invalid_title()}</CardTitle>
            <CardDescription>
              {m.mcp_consent_invalid_description()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link to="/" />} variant="outline">
              {m.mcp_consent_invalid_home()}
            </Button>
          </CardContent>
        </Card>
      </AuthPage>
    );
  }

  if (!session?.user) {
    const callback =
      typeof window === "undefined"
        ? "/mcp/consent"
        : `/mcp/consent${window.location.search}`;
    return (
      <AuthPage>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{m.mcp_consent_title()}</CardTitle>
            <CardDescription>
              {m.mcp_consent_sign_in_description()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {client_id ? (
              <ClientIdentity
                icon={consentClient.data?.icon ?? null}
                label={label}
              />
            ) : null}
            <Button
              render={<Link search={{ redirect: callback }} to="/login" />}
            >
              {m.auth_login()}
            </Button>
          </CardContent>
        </Card>
      </AuthPage>
    );
  }

  return (
    <ConsentView
      clientIcon={consentClient.data?.icon ?? null}
      clientId={client_id}
      clientName={label}
      oauthQuery={oauthQuery}
      scope={scope}
      userEmail={session.user.email}
      userName={session.user.name}
    />
  );
}

function ClientIdentity({
  icon,
  label,
}: {
  icon: string | null;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
      <Avatar className="h-10 w-10">
        {icon ? <AvatarImage alt="" src={icon} /> : null}
        <AvatarFallback className="text-xs">{initials(label)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">
          {m.mcp_consent_client()}
        </p>
        <p className="truncate font-medium text-sm">{label}</p>
      </div>
    </div>
  );
}

function ConsentView({
  oauthQuery,
  clientId,
  clientName,
  clientIcon,
  scope,
  userName,
  userEmail,
}: {
  oauthQuery: string;
  clientId: string;
  clientName: string;
  clientIcon: string | null;
  scope: string;
  userName: string;
  userEmail: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const { data: organizations, isPending: isOrgsPending } =
    authClient.useListOrganizations();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  const [pickedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const selectedOrgId =
    pickedOrgId ?? activeOrganization?.id ?? organizations?.[0]?.id ?? null;
  const selectedOrg = organizations?.find((org) => org.id === selectedOrgId);
  const singleOrg = (organizations?.length ?? 0) === 1;
  const shownScopes = extraScopes(scope);

  const submit = async (accept: boolean) => {
    if (accept && !selectedOrgId) {
      setError(m.mcp_consent_pick_org());
      setStatus("error");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await client.mcp.consent.$post({
        json: {
          oauth_query: oauthQuery,
          organizationId: selectedOrgId ?? "deny",
          accept,
        },
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || m.mcp_consent_failed());
      }
      const data = (await res.json()) as { redirect: boolean; url: string };
      window.location.href = data.url;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : m.mcp_consent_failed());
    }
  };

  return (
    <AuthPage>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{m.mcp_consent_title()}</CardTitle>
          <CardDescription>
            {singleOrg && selectedOrg
              ? m.mcp_consent_description_single({ org: selectedOrg.name })
              : m.mcp_consent_description()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {clientId ? (
            <ClientIdentity icon={clientIcon} label={clientName} />
          ) : null}
          <div className="space-y-1 rounded-lg border bg-muted/50 p-3">
            <p className="font-medium text-sm">{userName}</p>
            <p className="text-muted-foreground text-sm">{userEmail}</p>
          </div>
          {shownScopes ? (
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">
                {m.mcp_consent_scopes()}
              </Label>
              <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
                {shownScopes}
              </div>
            </div>
          ) : null}
          <OrgPickerSection
            isPending={isOrgsPending}
            onSelect={setSelectedOrgId}
            organizations={organizations ?? null}
            selectedOrgId={selectedOrgId}
          />
          <p className="text-muted-foreground text-xs leading-relaxed">
            {m.mcp_consent_access_note()}
          </p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {m.mcp_consent_binding_note()}
          </p>
          {status === "error" ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={status === "loading" || !selectedOrgId}
              onClick={() => submit(true)}
            >
              {status === "loading" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {m.mcp_consent_authorize()}
            </Button>
            <Button
              disabled={status === "loading"}
              onClick={() => submit(false)}
              variant="outline"
            >
              {m.mcp_consent_deny()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthPage>
  );
}

interface OrgListItem {
  id: string;
  name: string;
}

function OrgPickerSection({
  isPending,
  organizations,
  selectedOrgId,
  onSelect,
}: {
  isPending: boolean;
  organizations: OrgListItem[] | null;
  selectedOrgId: string | null;
  onSelect: (id: string) => void;
}) {
  if (isPending) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {m.mcp_consent_loading_orgs()}
      </div>
    );
  }
  if (!organizations?.length) {
    return (
      <div className="rounded-lg border border-amber-500/50 bg-amber-50 p-3 dark:bg-amber-950/20">
        <p className="text-amber-700 text-sm dark:text-amber-400">
          {m.mcp_consent_no_orgs()}{" "}
          <Link className="underline" to="/onboarding">
            {m.org_create()}
          </Link>
        </p>
      </div>
    );
  }
  if (organizations.length === 1) {
    const only = organizations[0];
    if (!only) {
      return null;
    }
    return (
      <div className="space-y-1">
        <Label className="text-muted-foreground text-xs">
          {m.mcp_consent_organization()}
        </Label>
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
          {only.name}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label
        className="text-muted-foreground text-xs"
        htmlFor="mcp-consent-org"
      >
        {m.mcp_consent_organization()}
      </Label>
      <Select
        onValueChange={(id) => {
          if (id != null) {
            onSelect(id);
          }
        }}
        value={selectedOrgId ?? undefined}
      >
        <SelectTrigger id="mcp-consent-org">
          <SelectValue placeholder={m.mcp_consent_pick_org()} />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
