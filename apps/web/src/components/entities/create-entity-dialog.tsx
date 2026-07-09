"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/shadcn/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCreateEntity } from "@/hooks/use-entities";
import { EntityForm, type EntityFormValues } from "./entity-form";
export function CreateEntityDialog() {
  const [open, setOpen] = useState(false);
  const createEntity = useCreateEntity();
  const onSubmit = async (data: EntityFormValues) => {
    await createEntity.mutateAsync({
      name: data.name,
      type: data.type,
      creditLimit: data.creditLimit ?? null,
    });
    setOpen(false);
  };
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />
        Add Entity
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Add Entity</DialogTitle>
          <DialogDescription>
            Create a customer or supplier counterparty.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <EntityForm
            isLoading={createEntity.isPending}
            onSubmit={onSubmit}
            submitLabel="Create Entity"
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
