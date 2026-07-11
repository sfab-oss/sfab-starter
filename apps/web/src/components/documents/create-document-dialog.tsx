"use client";

import { useNavigate } from "@tanstack/react-router";
import type { CreateableDocumentType } from "@workspace/contract/transaction";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { documentTypeLabel } from "@/components/documents/document-type";
import { useCreateDocument } from "@/hooks/use-documents";
import {
  DocumentCreateForm,
  type DocumentCreateFormValues,
} from "./document-create-form";

interface CreateDocumentDialogProps {
  open: boolean;
  type: CreateableDocumentType | null;
  onOpenChange: (open: boolean) => void;
}

export function CreateDocumentDialog({
  open,
  type,
  onOpenChange,
}: CreateDocumentDialogProps) {
  const navigate = useNavigate();
  const createDocument = useCreateDocument();

  const handleSubmit = async (data: DocumentCreateFormValues) => {
    if (!type) {
      return;
    }
    const direction = type === "bill" ? "purchase" : "sales";
    const entity = data.entity;
    const optional = {
      ...(data.currencyCode?.trim()
        ? { currencyCode: data.currencyCode.trim() }
        : {}),
      ...(data.series?.trim() ? { series: data.series.trim() } : {}),
    };
    const payload =
      entity.kind === "entity"
        ? {
            type,
            direction: direction as "sales" | "purchase",
            entityId: entity.entity.id,
            ...optional,
          }
        : {
            type,
            direction: direction as "sales" | "purchase",
            entityName: entity.kind === "walk_in" ? entity.name : "Walk-in",
            ...optional,
          };
    const doc = await createDocument.mutateAsync(payload);
    onOpenChange(false);
    navigate({
      to: "/documents/$id",
      params: { id: doc.id },
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            New {type ? documentTypeLabel(type) : "document"}
          </DialogTitle>
          <DialogDescription>
            Pick an existing entity or keep Walk-in for an ad-hoc name. Optional
            currency and series pass through when set.
          </DialogDescription>
        </DialogHeader>
        {type ? (
          <DocumentCreateForm
            isLoading={createDocument.isPending}
            key={type}
            onSubmit={handleSubmit}
            submitLabel="Create"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
