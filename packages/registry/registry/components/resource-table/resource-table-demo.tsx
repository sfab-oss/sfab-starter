import type { ColumnDef } from "@tanstack/react-table";
import { ResourceTable } from "@workspace/ui/components/brand/resource-table";
import { formatMoneyMinor } from "@workspace/ui/lib/money";
import { PaymentStatusBadge } from "../../_shared/collect/payment-status-badge";

interface InvoiceRow {
  id: string;
  client: string;
  totalMinor: number;
  balanceMinor: number;
  paymentStatus: "unpaid" | "partial" | "paid";
}

const MOCK_INVOICES: InvoiceRow[] = [
  {
    id: "INV-1042",
    client: "Northside Distributors",
    totalMinor: 125_000,
    balanceMinor: 75_000,
    paymentStatus: "partial",
  },
  {
    id: "INV-1043",
    client: "Central Grocery",
    totalMinor: 42_500,
    balanceMinor: 42_500,
    paymentStatus: "unpaid",
  },
  {
    id: "INV-1038",
    client: "Valley Beverages",
    totalMinor: 89_000,
    balanceMinor: 0,
    paymentStatus: "paid",
  },
  {
    id: "INV-1035",
    client: "Hernandez Trading",
    totalMinor: 18_750,
    balanceMinor: 18_750,
    paymentStatus: "unpaid",
  },
];

const columns: ColumnDef<InvoiceRow>[] = [
  {
    accessorKey: "client",
    header: "Customer",
  },
  {
    accessorKey: "totalMinor",
    header: () => <span className="block text-right">Total</span>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatMoneyMinor(row.original.totalMinor, "USD")}
      </div>
    ),
  },
  {
    accessorKey: "balanceMinor",
    header: () => <span className="block text-right">Balance</span>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatMoneyMinor(row.original.balanceMinor, "USD")}
      </div>
    ),
  },
  {
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => (
      <PaymentStatusBadge status={row.original.paymentStatus} />
    ),
  },
];

export default function ResourceTableDemo() {
  return (
    <div className="w-full p-4">
      <ResourceTable
        columns={columns}
        data={MOCK_INVOICES}
        filterPlaceholder="Search customers…"
        onRowClick={() => undefined}
        rowMenuActions={() => [
          { label: "View document", onSelect: () => undefined },
          { label: "Copy reference", onSelect: () => undefined },
        ]}
        rowPrimaryAction={(row) =>
          row.balanceMinor > 0
            ? { label: "Collect", onSelect: () => undefined }
            : null
        }
      />
    </div>
  );
}
