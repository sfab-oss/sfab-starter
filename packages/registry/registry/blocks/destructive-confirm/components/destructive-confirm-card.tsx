"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/shadcn/alert-dialog";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { toast } from "@workspace/ui/components/shadcn/sonner";

/**
 * The default destructive confirm: one AlertDialog with Cancel / Delete. Reach
 * for this for ordinary destroys where a misclick is recoverable enough. Escalate
 * to type-to-confirm only for irreversible, org-scoped deletes. Mount one
 * `<Toaster />` at the shell for the post-commit toast.
 */
export function DestructiveConfirmCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Destructive confirm</CardTitle>
        <CardDescription>
          Ordinary destructive action — a single AlertDialog with Cancel /
          Delete, then a toast once the mutation lands.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog defaultOpen>
          <AlertDialogTrigger
            render={<Button type="button" variant="outline" />}
          >
            Delete product
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this product?</AlertDialogTitle>
              <AlertDialogDescription>
                "Garrafón 20L" will be removed from the catalog. This cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => toast.success("Product deleted (mock)")}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
