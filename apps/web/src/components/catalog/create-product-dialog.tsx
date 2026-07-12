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
import { DEFAULT_CURRENCY, majorToMinor } from "@workspace/ui/lib/money";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCreateProduct } from "@/hooks/use-products";
import { m } from "@/paraglide/messages.js";
import { ProductForm, type ProductFormValues } from "./product-form";
export function CreateProductDialog() {
  const [open, setOpen] = useState(false);
  const createProduct = useCreateProduct();
  const onSubmit = async (data: ProductFormValues) => {
    await createProduct.mutateAsync({
      ...data,
      price: majorToMinor(data.price, DEFAULT_CURRENCY),
    });
    setOpen(false);
  };
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="mr-2 h-4 w-4" />
        {m.catalog_create()}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{m.catalog_add_title()}</DialogTitle>
          <DialogDescription>{m.catalog_add_description()}</DialogDescription>
        </DialogHeader>
        <ProductForm
          isLoading={createProduct.isPending}
          mode="create"
          onSubmit={onSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
