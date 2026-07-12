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
import { m } from "@/paraglide/messages.js";
import { InvitationError } from "./invitation-error-card";

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
      // Swallow — no mutation onError; failed accept leaves the pending UI as-is.
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync(invitationId);
      setInvitationStatus("rejected");
    } catch {
      // Swallow — no mutation onError; failed reject leaves the pending UI as-is.
    }
  };

  if (isLoading) {
    return <InvitationSkeleton />;
  }

  if (error || !invitation) {
    return <InvitationError />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{m.invite_accept_title()}</CardTitle>
          <p className="text-muted-foreground text-sm">
            {m.invite_accept_subtitle()}
          </p>
        </CardHeader>
        <CardContent>
          {invitationStatus === "pending" && (
            <div className="space-y-4">
              <p>
                {m.invite_accept_body({
                  email: invitation.inviter?.email ?? "",
                  org: invitation.organization?.name ?? "",
                })}
              </p>
              <p>{m.invite_accept_sent_to({ email: invitation.email })}</p>
            </div>
          )}
          {invitationStatus === "accepted" && (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-center font-bold text-2xl">
                {m.invite_accept_welcome({
                  name: invitation.organization?.name ?? "",
                })}
              </h2>
              <p className="text-center">{m.invite_accept_joined()}</p>
            </div>
          )}
          {invitationStatus === "rejected" && (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <XIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-center font-bold text-2xl">
                {m.invite_declined_title()}
              </h2>
              <p className="text-center">
                {m.invite_declined_body({
                  name: invitation.organization?.name ?? "",
                })}
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
              {m.invite_decline()}
            </Button>
            <Button disabled={acceptMutation.isPending} onClick={handleAccept}>
              {m.invite_accept()}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

function InvitationSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
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
