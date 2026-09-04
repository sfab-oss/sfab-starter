"use client";

import { authClient } from "@workspace/auth/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/shadcn/alert-dialog";
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
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { Check, Copy, Plug, ShieldOff } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useMcpMineConnections,
  useMcpOrgConnections,
  useRevokeMcpConnection,
} from "@/hooks/use-mcp-connections";
import { m } from "@/paraglide/messages.js";

interface McpConnectionRow {
  clientId: string;
  clientName: string | null;
  clientIcon: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  lastUsedAt: string;
}

interface PendingRevoke {
  clientId: string;
  userId: string;
  label: string;
}

const WHITESPACE = /\s+/;

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function clientLabel(row: McpConnectionRow): string {
  return row.clientName?.trim() || row.clientId;
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

export function McpSettingsSection() {
  const { data: activeMember, isPending: memberPending } =
    authClient.useActiveMember();
  const { data: session } = authClient.useSession();
  const sessionUserId = session?.user?.id;
  const isAdmin =
    activeMember?.role === "owner" || activeMember?.role === "admin";

  const org = useMcpOrgConnections(!memberPending && isAdmin);
  const mine = useMcpMineConnections(!(memberPending || isAdmin));
  const myItems = useMemo(() => {
    if (isAdmin) {
      if (!sessionUserId) {
        return [];
      }
      return (org.data ?? []).filter((row) => row.userId === sessionUserId);
    }
    return mine.data ?? [];
  }, [isAdmin, sessionUserId, org.data, mine.data]);
  const myLoading = memberPending || (isAdmin ? org.isLoading : mine.isLoading);

  const revoke = useRevokeMcpConnection();
  const [pending, setPending] = useState<PendingRevoke | null>(null);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const mcpUrl = `${origin}/mcp`;

  const cursorSnippet = useMemo(
    () =>
      JSON.stringify(
        {
          mcpServers: {
            starter: { url: mcpUrl },
          },
        },
        null,
        2
      ),
    [mcpUrl]
  );

  const handleRevoke = async () => {
    if (!pending) {
      return;
    }
    try {
      await revoke.mutateAsync({
        clientId: pending.clientId,
        userId: pending.userId,
      });
      toast.success(m.mcp_settings_revoked({ label: pending.label }));
      setPending(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : m.mcp_settings_revoke_failed()
      );
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            {m.mcp_settings_mine_title()}
          </CardTitle>
          <CardDescription>{m.mcp_settings_mine_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectionList
            empty={m.mcp_settings_mine_empty()}
            isLoading={myLoading}
            items={myItems}
            onRevoke={(row) =>
              setPending({
                clientId: row.clientId,
                userId: row.userId,
                label: clientLabel(row),
              })
            }
            showMember={false}
          />
        </CardContent>
      </Card>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5" />
              {m.mcp_settings_org_title()}
            </CardTitle>
            <CardDescription>
              {m.mcp_settings_org_description()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectionList
              empty={m.mcp_settings_org_empty()}
              isLoading={memberPending || org.isLoading}
              items={org.data ?? []}
              onRevoke={(row) =>
                setPending({
                  clientId: row.clientId,
                  userId: row.userId,
                  label: `${clientLabel(row)} (${row.userName})`,
                })
              }
              showMember
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{m.mcp_settings_setup_title()}</CardTitle>
          <CardDescription>
            {m.mcp_settings_setup_description()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="font-medium text-sm">{m.mcp_settings_url_label()}</p>
            <CopyableBlock text={mcpUrl} />
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="font-medium text-sm">
              {m.mcp_settings_cursor_title()}
            </p>
            <p className="text-muted-foreground text-xs">
              {m.mcp_settings_cursor_hint()}
            </p>
            <CopyableBlock text={cursorSnippet} />
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
          }
        }}
        open={pending !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.mcp_settings_revoke_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.mcp_settings_revoke_description({
                label: pending?.label ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {m.mcp_settings_revoke_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={revoke.isPending}
              onClick={handleRevoke}
            >
              {m.mcp_settings_revoke()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConnectionList({
  items,
  isLoading,
  empty,
  showMember,
  onRevoke,
}: {
  items: McpConnectionRow[];
  isLoading: boolean;
  empty: string;
  showMember: boolean;
  onRevoke: (row: McpConnectionRow) => void;
}) {
  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
        {empty}
      </div>
    );
  }

  return (
    <ul className="divide-y rounded-md border">
      {items.map((row) => (
        <li
          className="flex items-center justify-between gap-4 px-4 py-3"
          key={`${row.clientId}:${row.userId}`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <ClientIcon icon={row.clientIcon} name={clientLabel(row)} />
            <div className="min-w-0">
              <p className="truncate font-medium text-sm">{clientLabel(row)}</p>
              <p className="text-muted-foreground text-xs">
                {m.mcp_settings_updated({ when: formatWhen(row.lastUsedAt) })}
                {showMember ? (
                  <>
                    {" · "}
                    <span className="text-foreground">{row.userName}</span>
                    {row.userEmail ? ` (${row.userEmail})` : null}
                  </>
                ) : null}
              </p>
            </div>
          </div>
          <Button
            onClick={() => onRevoke(row)}
            size="sm"
            type="button"
            variant="outline"
          >
            {m.mcp_settings_revoke()}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function ClientIcon({ icon, name }: { icon: string | null; name: string }) {
  return (
    <Avatar className="h-9 w-9">
      {icon ? <AvatarImage alt="" src={icon} /> : null}
      <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
    </Avatar>
  );
}

function CopyableBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(m.mcp_settings_copy_failed());
    }
  };

  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 pr-12 font-mono text-xs">
        {text}
      </pre>
      <Button
        aria-label={m.mcp_settings_copy()}
        className="absolute top-2 right-2"
        onClick={copy}
        size="icon-sm"
        type="button"
        variant="ghost"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}
