import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@workspace/ui/components/brand/data-table";
import { Badge } from "@workspace/ui/components/shadcn/badge";

/**
 * The inventory table for the operator dashboard block — the brand `DataTable`
 * (client-side filter, sort, paging, column visibility) over mock stock data.
 * Self-contained: it owns its columns and mock rows so the block has no backend.
 */

interface Product {
  sku: string;
  name: string;
  warehouse: string;
  stock: number;
  status: "In stock" | "Low" | "Out of stock";
}

const PRODUCTS: Product[] = [
  {
    sku: "SKU-1042",
    name: "Aluminium bracket",
    warehouse: "CDMX-01",
    stock: 320,
    status: "In stock",
  },
  {
    sku: "SKU-2271",
    name: "Hex bolt M8",
    warehouse: "CDMX-01",
    stock: 18,
    status: "Low",
  },
  {
    sku: "SKU-3390",
    name: "Rubber gasket 40mm",
    warehouse: "GDL-02",
    stock: 0,
    status: "Out of stock",
  },
  {
    sku: "SKU-4418",
    name: "Steel washer",
    warehouse: "MTY-03",
    stock: 1240,
    status: "In stock",
  },
  {
    sku: "SKU-5526",
    name: "Copper wire 2.5mm",
    warehouse: "GDL-02",
    stock: 64,
    status: "In stock",
  },
  {
    sku: "SKU-6634",
    name: "PVC conduit 20mm",
    warehouse: "MTY-03",
    stock: 9,
    status: "Low",
  },
  {
    sku: "SKU-7742",
    name: "Junction box",
    warehouse: "CDMX-01",
    stock: 210,
    status: "In stock",
  },
  {
    sku: "SKU-8850",
    name: "Cable tie 200mm",
    warehouse: "GDL-02",
    stock: 0,
    status: "Out of stock",
  },
];

const STATUS_VARIANT: Record<
  Product["status"],
  "default" | "secondary" | "destructive"
> = {
  "In stock": "secondary",
  Low: "default",
  "Out of stock": "destructive",
};

const columns: ColumnDef<Product>[] = [
  { accessorKey: "sku", header: "SKU" },
  { accessorKey: "name", header: "Product" },
  { accessorKey: "warehouse", header: "Warehouse" },
  {
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.stock.toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={STATUS_VARIANT[row.original.status]}>
        {row.original.status}
      </Badge>
    ),
  },
];

export function InventoryTable() {
  return (
    <DataTable
      columns={columns}
      data={PRODUCTS}
      filterColumn="name"
      filterPlaceholder="Filter products..."
    />
  );
}
