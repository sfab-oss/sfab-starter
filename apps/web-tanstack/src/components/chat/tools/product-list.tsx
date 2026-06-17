"use client";

import { Link } from "@tanstack/react-router";
import { Skeleton } from "@workspace/ui/components/shadcn/skeleton";
import { memo } from "react";
import { useProduct } from "@/hooks/use-products";
import type { ToolRenderProps } from "./tool-registry";

interface DisplayProductListOutput {
  productIds?: string[];
}

function ProductRow({ productId }: { productId: string }) {
  const { data: product, isLoading, isError } = useProduct(productId);

  if (isLoading) {
    return (
      <div className="flex min-w-0 items-center gap-2 px-3 py-2">
        <Skeleton className="h-4 min-w-0 flex-1" />
        <Skeleton className="h-4 w-16 shrink-0" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="px-3 py-2 text-muted-foreground text-sm">
        Product not found ({productId})
      </div>
    );
  }

  return (
    <Link
      className="flex min-w-0 items-center gap-2 px-3 py-2 hover:bg-muted/50"
      params={{ id: product.id }}
      to="/inventory/$id"
    >
      <span className="min-w-0 flex-1 truncate font-medium">
        {product.name}
      </span>
      <span className="shrink-0 text-muted-foreground text-xs">
        {product.sku}
      </span>
      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
        {product.totalStock} in stock
      </span>
    </Link>
  );
}

export const ProductListDisplay = memo(({ part }: ToolRenderProps) => {
  const output = part.output as DisplayProductListOutput | undefined;
  const productIds = output?.productIds ?? [];

  if (productIds.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No products to display.</p>
    );
  }

  return (
    <div className="divide-y rounded-md border bg-card text-sm">
      {productIds.map((productId) => (
        <ProductRow key={productId} productId={productId} />
      ))}
    </div>
  );
});

ProductListDisplay.displayName = "ProductListDisplay";
