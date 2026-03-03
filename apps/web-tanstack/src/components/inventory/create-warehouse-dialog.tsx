"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/shadcn/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCreateWarehouse } from "@/hooks/use-warehouses";
import { WarehouseForm, type WarehouseFormValues } from "./warehouse-form";

export function CreateWarehouseDialog() {
  const [open, setOpen] = useState(false);
  const createWarehouse = useCreateWarehouse();

  const onSubmit = async (data: WarehouseFormValues) => {
    await createWarehouse.mutateAsync(data);
    setOpen(false);
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Warehouse
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Warehouse</DialogTitle>
          <DialogDescription>
            Create a new warehouse for your inventory.
          </DialogDescription>
        </DialogHeader>
        <WarehouseForm
          isLoading={createWarehouse.isPending}
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
