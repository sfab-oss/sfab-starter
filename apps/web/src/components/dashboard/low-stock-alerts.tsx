import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { AlertTriangle } from "lucide-react";
import { useInventoryMetrics } from "@/hooks/use-products";

export function LowStockAlerts() {
  const { data: metrics } = useInventoryMetrics();
  const products = metrics?.activeProducts;

  const lowStockProducts =
    products?.filter(
      (p: { minStockLevel: number | null; totalStock: number }) =>
        p.minStockLevel !== null && p.totalStock < p.minStockLevel
    ) || [];

  if (lowStockProducts.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {lowStockProducts.map((product) => (
            <li className="flex justify-between" key={product.id}>
              <span>
                {product.name} ({product.sku})
              </span>
              <span className="text-red-500">
                {product.totalStock} / {product.minStockLevel}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
