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
import { useCreateProduct } from "@/hooks/query/use-products";
import { ProductForm, type ProductFormValues } from "./product-form";

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const createProduct = useCreateProduct();

  const onSubmit = async (data: ProductFormValues) => {
    await createProduct.mutateAsync(data);
    setOpen(false);
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Create a new product record in your inventory.
          </DialogDescription>
        </DialogHeader>
        <ProductForm isLoading={createProduct.isPending} onSubmit={onSubmit} />
      </DialogContent>
    </Dialog>
  );
}
