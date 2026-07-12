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
import { m } from "@/paraglide/messages.js";
import {
  DocumentCreateForm,
  type DocumentCreateFormValues,
} from "./document-create-form";

const ISO_CURRENCY_CODE = /^[A-Z]{3}$/;

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
    const currencyCode = data.currencyCode?.trim().toUpperCase() ?? "";
    const optional = {
      ...(currencyCode && ISO_CURRENCY_CODE.test(currencyCode)
        ? { currencyCode }
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
            entityName:
              entity.kind === "walk_in" ? entity.name : m.documents_walk_in(),
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
            {m.documents_create_title({
              type: type ? documentTypeLabel(type) : m.documents_document(),
            })}
          </DialogTitle>
          <DialogDescription>
            {m.documents_create_description()}
          </DialogDescription>
        </DialogHeader>
        {type ? (
          <DocumentCreateForm
            isLoading={createDocument.isPending}
            key={type}
            onSubmit={handleSubmit}
            submitLabel={m.common_create()}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
