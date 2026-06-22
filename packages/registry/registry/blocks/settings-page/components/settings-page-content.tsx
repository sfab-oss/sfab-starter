"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { Separator } from "@workspace/ui/components/shadcn/separator";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import { useOrganizationSettings } from "../hooks/use-organization-settings";
import {
  ORGANIZATION_SETTINGS_SECTIONS,
  SETTINGS_GENERAL_PATH,
  SETTINGS_MEMBERS_PATH,
} from "../lib/settings-sections";
import { InviteMemberForm } from "./invite-member-form";
import { InvitationsTable, MembersTable } from "./members-tables";
import { OrganizationDetailsForm } from "./organization-details-form";
import { SettingsSectionLayout } from "./settings-nav";

export function SettingsPageContent() {
  const [activePath, setActivePath] = useState(SETTINGS_GENERAL_PATH);
  const { data: organization, isLoading } = useOrganizationSettings();

  if (isLoading || !organization) {
    return (
      <SettingsSectionLayout
        activePath={activePath}
        onItemSelect={setActivePath}
        sections={ORGANIZATION_SETTINGS_SECTIONS}
      >
        <div data-slot="settings-page-content">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <Separator className="my-8" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </SettingsSectionLayout>
    );
  }

  return (
    <SettingsSectionLayout
      activePath={activePath}
      onItemSelect={setActivePath}
      sections={ORGANIZATION_SETTINGS_SECTIONS}
    >
      <div data-slot="settings-page-content">
        {activePath === SETTINGS_GENERAL_PATH ? (
          <Card>
            <CardHeader>
              <CardTitle>Organization details</CardTitle>
              <CardDescription>
                Update your organization name and slug
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OrganizationDetailsForm
                defaultValues={{
                  name: organization.name,
                  slug: organization.slug,
                }}
              />
            </CardContent>
          </Card>
        ) : null}

        {activePath === SETTINGS_MEMBERS_PATH ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Invite people to {organization.name}
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
              <MembersTable members={organization.members} />
            </div>

            <Separator />

            <div>
              <h2 className="mb-4 font-bold text-xl">Pending invitations</h2>
              <InvitationsTable invitations={organization.invitations} />
            </div>
          </>
        ) : null}
      </div>
    </SettingsSectionLayout>
  );
}
