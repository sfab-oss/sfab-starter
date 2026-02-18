"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { ArrowDownLeft, Package } from "lucide-react";
import Link from "next/link";
import { useProducts } from "@/hooks/query/use-products";

export function DashboardStats() {
  const { data: products } = useProducts();

  const totalSKUs = products?.length || 0;
  const totalValue =
    products?.reduce(
      (sum, p) => sum + p.totalStock * Number.parseFloat(p.price || "0"),
      0
    ) || 0;

  return (
    <div className="grid @lg:grid-cols-3 @md:grid-cols-2 gap-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="font-medium text-primary text-sm">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button asChild className="w-full justify-start" variant="outline">
            <Link href="/inventory">
              <ArrowDownLeft className="mr-2 h-4 w-4" />
              Receive Stock
            </Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">Total SKUs</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">{totalSKUs}</div>
          <p className="text-muted-foreground text-xs">Active products</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="font-medium text-sm">
            Total Inventory Value
          </CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="font-bold text-2xl">${totalValue.toFixed(2)}</div>
          <p className="text-muted-foreground text-xs">Current asset value</p>
        </CardContent>
      </Card>
    </div>
  );
}
