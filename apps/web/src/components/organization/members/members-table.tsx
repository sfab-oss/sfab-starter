"use client";

import {
  can,
  ROLE_LABELS,
  type RoleName,
} from "@workspace/auth/access-control";
import { authClient } from "@workspace/auth/client";
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
import { useRemoveMember } from "@/hooks/use-organization";

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
const roleLabel = (role: string) => ROLE_LABELS[role as RoleName] ?? role;

export function MembersTable({ members }: MembersTableProps) {
  const { data: session } = authClient.useSession();
  const { data: activeMember } = authClient.useActiveMember();
  // Removing other members is admin+; you can always leave yourself.
  const canManageMembers = can("member:manage", {
    role: activeMember?.role ?? null,
  });
  const removeMember = useRemoveMember();
  const [removingMemberId, setRemovingMemberId] = useState<
    string | undefined
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
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove member"
      );
    } finally {
      setRemovingMemberId(undefined);
    }
  };

  return (
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
                  onClick={() => handleRemoveMember(member)}
                  title={
                    canAct
                      ? undefined
                      : "Solo los administradores pueden quitar miembros"
                  }
                  variant="ghost"
                >
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  {!isLoading && isCurrentUser && "Leave"}
                  {!(isLoading || isCurrentUser) && "Remove"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
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
  const formatDate = (dateString: Date | string) => {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (invitations.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground text-sm">
        No pending invitations
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Expires At</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell>{invitation.email}</TableCell>
            <TableCell>{roleLabel(invitation.role)}</TableCell>
            <TableCell className="capitalize">{invitation.status}</TableCell>
            <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
