"use client";

import { Avatar, AvatarFallback } from "@workspace/ui/components/shadcn/avatar";
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
import {
  type MockInvitation,
  type MockMember,
  ROLE_LABELS,
} from "../lib/mock-organization";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MembersTable({
  members,
  currentUserId = "user-sarah",
  canManageMembers = true,
}: {
  members: MockMember[];
  currentUserId?: string;
  canManageMembers?: boolean;
}) {
  const [removingMemberId, setRemovingMemberId] = useState<
    string | undefined
  >();

  const handleRemoveMember = async (member: MockMember) => {
    setRemovingMemberId(member.id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      toast.success(
        currentUserId === member.userId
          ? "You left the organization (gallery mock)"
          : "Member removed (gallery mock)"
      );
    } finally {
      setRemovingMemberId(undefined);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const isCurrentUser = currentUserId === member.userId;
          const isLoading = removingMemberId === member.id;
          const canAct = isCurrentUser || canManageMembers;

          return (
            <TableRow key={member.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{member.user.initials}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{member.user.name}</span>
                </div>
              </TableCell>
              <TableCell>{member.user.email}</TableCell>
              <TableCell>{ROLE_LABELS[member.role]}</TableCell>
              <TableCell className="text-right">
                <Button
                  className="h-auto px-2 py-1 text-destructive text-xs underline hover:no-underline"
                  disabled={isLoading || !canAct}
                  onClick={() => handleRemoveMember(member)}
                  title={
                    canAct
                      ? undefined
                      : "Only administrators can remove members"
                  }
                  type="button"
                  variant="ghost"
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  {!isLoading && isCurrentUser ? "Leave" : null}
                  {isLoading || isCurrentUser ? null : "Remove"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function InvitationsTable({
  invitations,
}: {
  invitations: MockInvitation[];
}) {
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
          <TableHead>Expires</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell>{invitation.email}</TableCell>
            <TableCell>{ROLE_LABELS[invitation.role]}</TableCell>
            <TableCell className="capitalize">{invitation.status}</TableCell>
            <TableCell>{formatDate(invitation.expiresAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
