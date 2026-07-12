"use client";

import { can, type RoleName } from "@workspace/auth/access-control";
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
import { toast } from "@workspace/ui/components/shadcn/sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/shadcn/table";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useCancelInvitation, useRemoveMember } from "@/hooks/use-organization";
import { intlLocale } from "@/lib/locale";
import { roleMessage } from "@/lib/role-label";
import { m } from "@/paraglide/messages.js";

interface Member {
  id: string;
  userId: string;
  role: string;
  createdAt: Date | string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

interface MembersTableProps {
  members: Member[];
}

// "operator" = better-auth `member` renamed in UI copy only (no schema change).
const roleLabel = (role: string) =>
  role in { owner: 1, admin: 1, member: 1 }
    ? roleMessage(role as RoleName)
    : role;

export function MembersTable({ members }: MembersTableProps) {
  const { data: session } = authClient.useSession();
  const { data: activeMember } = authClient.useActiveMember();
  const { data: activeOrganization } = authClient.useActiveOrganization();
  // Removing other members is admin+; you can always leave yourself.
  const canManageMembers = can("member:manage", {
    role: activeMember?.role ?? null,
  });
  const removeMember = useRemoveMember();
  const [removingMemberId, setRemovingMemberId] = useState<
    string | undefined
  >();
  const [memberPendingRemoval, setMemberPendingRemoval] = useState<
    Member | undefined
  >();

  const handleRemoveMember = async (member: Member) => {
    setRemovingMemberId(member.id);
    try {
      await removeMember.mutateAsync({ memberIdOrEmail: member.id });
      toast.success(
        session?.user?.id === member.userId
          ? m.members_left()
          : m.members_removed()
      );
      setMemberPendingRemoval(undefined);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : m.members_remove_failed()
      );
    } finally {
      setRemovingMemberId(undefined);
    }
  };

  const pendingIsCurrentUser =
    memberPendingRemoval && session?.user?.id === memberPendingRemoval.userId;

  const removeConfirmLabel = (() => {
    if (removeMember.isPending) {
      return pendingIsCurrentUser ? m.members_leaving() : m.members_removing();
    }
    return pendingIsCurrentUser
      ? m.members_leave_organization()
      : m.members_remove_member();
  })();

  const onConfirmRemove = () => {
    if (memberPendingRemoval) {
      handleRemoveMember(memberPendingRemoval);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.members_column_avatar()}</TableHead>
            <TableHead>{m.members_column_name()}</TableHead>
            <TableHead>{m.members_column_email()}</TableHead>
            <TableHead>{m.members_column_role()}</TableHead>
            <TableHead className="text-right">
              {m.members_column_actions()}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isCurrentUser = session?.user?.id === member.userId;
            const isLoading = removingMemberId === member.id;
            // Operators can leave, but not remove others (honest-disabled).
            const canAct = isCurrentUser || canManageMembers;

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.image ?? undefined} />
                    <AvatarFallback>
                      {member.user.name?.slice(0, 2).toUpperCase() ?? "??"}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  {member.user.name ?? "Unknown"}
                </TableCell>
                <TableCell>{member.user.email}</TableCell>
                <TableCell>{roleLabel(member.role)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    className="h-auto px-2 py-1 text-destructive text-xs underline hover:no-underline"
                    disabled={isLoading || !canAct}
                    onClick={() => setMemberPendingRemoval(member)}
                    title={canAct ? undefined : m.invite_remove_admin_only()}
                    variant="ghost"
                  >
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    {!isLoading && isCurrentUser && m.members_leave()}
                    {!(isLoading || isCurrentUser) && m.members_remove()}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setMemberPendingRemoval(undefined);
          }
        }}
        open={!!memberPendingRemoval}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingIsCurrentUser
                ? m.members_leave_title()
                : m.members_remove_title({
                    name:
                      memberPendingRemoval?.user.name ??
                      m.members_this_member(),
                  })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingIsCurrentUser
                ? m.members_leave_description({
                    org: activeOrganization?.name ?? "",
                  })
                : m.members_remove_description({
                    name:
                      memberPendingRemoval?.user.name ??
                      m.members_this_member(),
                    org: activeOrganization?.name ?? "",
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>
              {m.common_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={removeMember.isPending}
              onClick={onConfirmRemove}
            >
              {removeConfirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: Date | string;
}

interface InvitationsTableProps {
  invitations: Invitation[];
}

export function InvitationsTable({ invitations }: InvitationsTableProps) {
  const { data: activeMember } = authClient.useActiveMember();
  const canManageMembers = can("member:manage", {
    role: activeMember?.role ?? null,
  });
  const cancelInvitation = useCancelInvitation();
  const [invitationPendingCancel, setInvitationPendingCancel] = useState<
    Invitation | undefined
  >();

  const formatDate = (dateString: Date | string) => {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString(intlLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCancelInvitation = async (invitation: Invitation) => {
    try {
      await cancelInvitation.mutateAsync(invitation.id);
      toast.success(m.members_invitation_cancelled());
      setInvitationPendingCancel(undefined);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : m.members_cancel_invitation_failed()
      );
    }
  };

  const onConfirmCancel = () => {
    if (invitationPendingCancel) {
      handleCancelInvitation(invitationPendingCancel);
    }
  };

  if (invitations.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        {m.members_pending_empty()}
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.members_column_email()}</TableHead>
            <TableHead>{m.members_column_role()}</TableHead>
            <TableHead>{m.members_column_status()}</TableHead>
            <TableHead>{m.members_column_expires()}</TableHead>
            {canManageMembers && (
              <TableHead className="text-right">
                {m.members_column_actions()}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>{invitation.email}</TableCell>
              <TableCell>{roleLabel(invitation.role)}</TableCell>
              <TableCell className="capitalize">{invitation.status}</TableCell>
              <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
              {canManageMembers && (
                <TableCell className="text-right">
                  <Button
                    className="h-auto px-2 py-1 text-destructive text-xs underline hover:no-underline"
                    disabled={cancelInvitation.isPending}
                    onClick={() => setInvitationPendingCancel(invitation)}
                    variant="ghost"
                  >
                    {m.members_cancel_invitation()}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setInvitationPendingCancel(undefined);
          }
        }}
        open={!!invitationPendingCancel}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.members_cancel_invitation_title()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.members_cancel_invitation_description({
                email: invitationPendingCancel?.email ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelInvitation.isPending}>
              {m.common_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelInvitation.isPending}
              onClick={onConfirmCancel}
            >
              {cancelInvitation.isPending
                ? m.members_cancelling()
                : m.members_cancel_invitation()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
