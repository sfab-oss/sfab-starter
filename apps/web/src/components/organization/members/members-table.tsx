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
          ? "You've left the organization"
          : "Member removed successfully"
      );
      setMemberPendingRemoval(undefined);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    } finally {
      setRemovingMemberId(undefined);
    }
  };

  const pendingIsCurrentUser =
    memberPendingRemoval && session?.user?.id === memberPendingRemoval.userId;

  const removeConfirmLabel = (() => {
    if (removeMember.isPending) {
      return pendingIsCurrentUser ? "Leaving..." : "Removing...";
    }
    return pendingIsCurrentUser ? "Leave organization" : "Remove member";
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
            <TableHead>Avatar</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="text-right">Actions</TableHead>
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
                ? "Leave organization?"
                : `Remove ${memberPendingRemoval?.user.name ?? "member"}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingIsCurrentUser ? (
                <>
                  You will lose access to{" "}
                  <strong>{activeOrganization?.name}</strong>. You can rejoin
                  only if another member invites you again.
                </>
              ) : (
                <>
                  This will remove{" "}
                  <strong>
                    {memberPendingRemoval?.user.name ?? "this member"}
                  </strong>{" "}
                  from <strong>{activeOrganization?.name}</strong>. They will
                  lose access immediately.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>
              Cancel
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
  const { data: activeOrganization } = authClient.useActiveOrganization();
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
      toast.success("Invitation cancelled");
      setInvitationPendingCancel(undefined);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel invitation"
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
        No pending invitations
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires At</TableHead>
            {canManageMembers && (
              <TableHead className="text-right">Actions</TableHead>
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
                    Cancel
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
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the pending invitation for{" "}
              <strong>{invitationPendingCancel?.email}</strong> to join{" "}
              <strong>{activeOrganization?.name}</strong>. They will not be able
              to accept it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelInvitation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelInvitation.isPending}
              onClick={onConfirmCancel}
            >
              {cancelInvitation.isPending
                ? "Cancelling..."
                : "Cancel invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
