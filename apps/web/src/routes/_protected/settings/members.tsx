import { createFileRoute } from "@tanstack/react-router";
import { authClient } from "@workspace/auth/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { UserPlus } from "lucide-react";
import { InviteMemberForm } from "@/components/organization/members/invite-member-form";
import {
  InvitationsTable,
  MembersTable,
} from "@/components/organization/members/members-table";

export const Route = createFileRoute("/_protected/settings/members")({
  component: MembersSettingsPage,
});

function MembersSettingsPage() {
  const { data: activeOrganization } = authClient.useActiveOrganization();

  if (!activeOrganization) {
    return null;
  }

  const members = activeOrganization.members ?? [];
  const pendingInvitations = (activeOrganization.invitations ?? []).filter(
    (invitation) => invitation.status === "pending"
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite People to {activeOrganization.name}
          </CardTitle>
          <CardDescription>
            Invite new members to your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteMemberForm />
        </CardContent>
      </Card>

      <Separator />

      <div>
        <h2 className="mb-4 font-bold text-xl">Members</h2>
        <MembersTable members={members} />
      </div>

      <Separator />

      <div>
        <h2 className="mb-4 font-bold text-xl">Pending Invitations</h2>
        <InvitationsTable invitations={pendingInvitations} />
      </div>
    </>
  );
}
