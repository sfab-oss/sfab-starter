"use client";

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
import { TypeNameConfirmDialog } from "./type-name-confirm-dialog";

/**
 * Demonstrates opening `TypeNameConfirmDialog` from a controlled trigger. In a
 * real feature you'd open it after your own guard and run the delete mutation in
 * `onConfirm`.
 */
export function TypeToConfirmCard() {
  const [open, setOpen] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Type-to-confirm</CardTitle>
        <CardDescription>
          Irreversible, org-scoped destroy — the Delete button stays disabled
          until the operator types the resource's exact name.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setOpen(true)} type="button" variant="outline">
          Delete organization
        </Button>
      </CardContent>

      <TypeNameConfirmDialog
        description="This permanently deletes the organization, its members, and all its documents. This cannot be undone."
        onConfirm={() => toast.success("Organization deleted (mock)")}
        onOpenChange={setOpen}
        open={open}
        resourceName="Northside Distributors"
        title="Delete organization"
      />
    </Card>
  );
}
