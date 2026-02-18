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
import {
  WarehouseForm,
  type WarehouseFormValues,
} from "@/components/inventory/warehouse-form";
import { useCreateWarehouse } from "@/hooks/query/use-warehouses";

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
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Warehouse
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Warehouse</DialogTitle>
          <DialogDescription>
            Add a new storage location for your inventory.
          </DialogDescription>
        </DialogHeader>
        <WarehouseForm
          isLoading={createWarehouse.isPending}
          onCancel={() => setOpen(false)}
          onSubmit={onSubmit}
          submitLabel="Create Warehouse"
        />
      </DialogContent>
    </Dialog>
  );
}
