"use client";

import { useNavigate } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import {
  useAcceptInvitation,
  useInvitation,
  useRejectInvitation,
} from "@/hooks/use-organization";
import { InvitationError } from "./invitation-error";

export default function AcceptInvitation({
  invitationId,
}: {
  invitationId: string;
}) {
  const navigate = useNavigate();
  const [invitationStatus, setInvitationStatus] = useState<
    "pending" | "accepted" | "rejected"
  >("pending");

  const { data: invitation, error, isLoading } = useInvitation(invitationId);
  const acceptMutation = useAcceptInvitation();
  const rejectMutation = useRejectInvitation();

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync(invitationId);
      setInvitationStatus("accepted");
      navigate({ to: "/" });
    } catch {
      // Error is handled by mutation
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync(invitationId);
      setInvitationStatus("rejected");
    } catch {
      // Error is handled by mutation
    }
  };

  if (isLoading) {
    return <InvitationSkeleton />;
  }

  if (error || !invitation) {
    return <InvitationError />;
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="mask-[radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none absolute inset-0 flex items-center justify-center bg-white dark:bg-black" />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation</CardTitle>
          <p className="text-muted-foreground text-sm">
            You&apos;ve been invited to join an organization
          </p>
        </CardHeader>
        <CardContent>
          {invitationStatus === "pending" && (
            <div className="space-y-4">
              <p>
                <strong>{invitation.inviter?.email}</strong> has invited you to
                join <strong>{invitation.organization?.name}</strong>.
              </p>
              <p>
                This invitation was sent to <strong>{invitation.email}</strong>.
              </p>
            </div>
          )}
          {invitationStatus === "accepted" && (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-center font-bold text-2xl">
                Welcome to {invitation.organization?.name}!
              </h2>
              <p className="text-center">
                You&apos;ve successfully joined the organization. We&apos;re
                excited to have you on board!
              </p>
            </div>
          )}
          {invitationStatus === "rejected" && (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XIcon className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-center font-bold text-2xl">
                Invitation Declined
              </h2>
              <p className="text-center">
                You&apos;ve declined the invitation to join{" "}
                {invitation.organization?.name}.
              </p>
            </div>
          )}
        </CardContent>
        {invitationStatus === "pending" && (
          <CardFooter className="flex justify-between">
            <Button
              disabled={rejectMutation.isPending}
              onClick={handleReject}
              variant="outline"
            >
              Decline
            </Button>
            <Button disabled={acceptMutation.isPending} onClick={handleAccept}>
              Accept invitation
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

function InvitationSkeleton() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Skeleton className="h-10 w-24" />
        </CardFooter>
      </Card>
    </div>
  );
}
