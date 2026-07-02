"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/shadcn/alert-dialog";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Field, FieldLabel } from "@workspace/ui/components/shadcn/field";
import { Input } from "@workspace/ui/components/shadcn/input";
import { useId, useState } from "react";

/**
 * Type-to-confirm — a guard for an irreversible, org-scoped destroy. The
 * destructive button stays disabled until the operator types the resource's
 * exact name, so a one-click slip can't nuke it. Reserve this for the
 * highest-stakes deletes (delete organization); ordinary deletes only need a
 * plain AlertDialog.
 *
 * Controlled: open it after your own guard, then run the mutation in `onConfirm`.
 */
export function TypeNameConfirmDialog({
  open,
  onOpenChange,
  resourceName,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceName: string;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === resourceName;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTyped("");
    }
    onOpenChange(next);
  }

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor={inputId}>
            Type{" "}
            <span className="font-medium text-foreground">{resourceName}</span>{" "}
            to confirm
          </FieldLabel>
          <Input
            autoComplete="off"
            id={inputId}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={resourceName}
            value={typed}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            disabled={!matches}
            onClick={() => {
              onConfirm();
              handleOpenChange(false);
            }}
            type="button"
            variant="destructive"
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
