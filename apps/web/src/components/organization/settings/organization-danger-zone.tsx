"use client";

import { useNavigate } from "@tanstack/react-router";
import { hasRoleRank } from "@workspace/auth/access-control";
import { authClient } from "@workspace/auth/client";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { toast } from "@workspace/ui/components/shadcn/sonner";
import { useState } from "react";
import { TypeNameConfirmDialog } from "@/components/confirm/type-name-confirm-dialog";
import { useDeleteOrganization } from "@/hooks/use-organization";

interface OrganizationDangerZoneProps {
  organization: {
    id: string;
    name: string;
  };
}

export function OrganizationDangerZone({
  organization,
}: OrganizationDangerZoneProps) {
  const navigate = useNavigate();
  const { data: activeMember } = authClient.useActiveMember();
  const { data: organizations } = authClient.useListOrganizations();
  const deleteOrganization = useDeleteOrganization();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isOwner = hasRoleRank(activeMember?.role, "owner");

  if (!isOwner) {
    return null;
  }

  const handleDelete = async () => {
    try {
      await deleteOrganization.mutateAsync(organization.id);
      toast.success("Organization deleted");

      const remaining = organizations?.filter(
        (org) => org.id !== organization.id
      );
      const nextOrganization = remaining?.[0];
      if (nextOrganization) {
        await authClient.organization.setActive({
          organizationId: nextOrganization.id,
        });
        navigate({ to: "/" });
      } else {
        await authClient.organization.setActive({ organizationId: null });
        navigate({ to: "/onboarding" });
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete organization"
      );
    }
  };

  return (
    <>
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete this organization and all of its data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => setIsDeleteDialogOpen(true)}
            type="button"
            variant="outline"
          >
            Delete organization
          </Button>
        </CardContent>
      </Card>

      <TypeNameConfirmDialog
        confirmLabel="Delete organization"
        description="This permanently deletes the organization, its members, and all its data. This cannot be undone."
        onConfirm={handleDelete}
        onOpenChange={setIsDeleteDialogOpen}
        open={isDeleteDialogOpen}
        resourceName={organization.name}
        title="Delete organization"
      />
    </>
  );
}
