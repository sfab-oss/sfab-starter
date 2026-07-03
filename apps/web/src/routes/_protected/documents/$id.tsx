import { createFileRoute } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellHeader,
  ShellHeaderSidebarTrigger,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import { Input } from "@workspace/ui/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/shadcn/select";
import { formatMoneyMinor } from "@workspace/ui/lib/money";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { useSetPageContext } from "@/components/providers/page-context";
import {
  useActivity,
  useAddLineItem,
  useDocument,
  useFinalizeDocument,
  useRecordPayment,
} from "@/hooks/use-documents";

export const Route = createFileRoute("/_protected/documents/$id")({
  component: DocumentPage,
});

function paymentBadgeVariant(
  status: string
): "default" | "secondary" | "outline" {
  if (status === "paid") {
    return "default";
  }
  if (status === "partial") {
    return "secondary";
  }
  return "outline";
}

function RecordPaymentForm({
  docId,
  disabled,
}: {
  docId: string;
  disabled: boolean;
}) {
  const recordPayment = useRecordPayment();
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      return;
    }
    await recordPayment.mutateAsync({
      input: {
        amount,
        method,
        allocations: [{ documentId: docId, amount }],
      },
    });
    setAmount(0);
  };

  return (
    <form className="space-y-2 rounded-lg border p-4" onSubmit={handleSubmit}>
      <h3 className="font-medium text-sm">Record payment</h3>
      <div className="flex gap-2">
        <Select onValueChange={setMethod} value={method}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="card">Card</SelectItem>
          </SelectContent>
        </Select>
        <Input
          className="flex-1"
          min={0}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          placeholder="Amount (minor)"
          type="number"
          value={amount}
        />
        <Button
          disabled={disabled || recordPayment.isPending || amount <= 0}
          type="submit"
        >
          Pay
        </Button>
      </div>
    </form>
  );
}

function DocumentPage() {
  const { id } = Route.useParams();
  const { data } = useDocument(id);
  const { data: activityResp } = useActivity(id);
  const addLineItem = useAddLineItem();
  const finalize = useFinalizeDocument();

  const doc = data?.doc;
  const lines = data?.lines ?? [];

  useSetPageContext(
    useMemo(
      () => ({
        title: doc ? `${doc.type} ${doc.folio ?? ""}` : "Document",
        description: doc?.entityName ?? undefined,
        entityType: "document",
        entityId: id,
      }),
      [doc, id]
    )
  );

  const [line, setLine] = useState({
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 0,
  });

  const handleAddLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!line.description) {
      return;
    }
    await addLineItem.mutateAsync({
      id,
      data: {
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate || undefined,
      },
    });
    setLine({ description: "", quantity: 1, unitPrice: 0, taxRate: 0 });
  };

  const handleFinalize = async () => {
    await finalize.mutateAsync(id);
  };

  if (!doc) {
    return (
      <ShellPage>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <h2 className="font-semibold text-xl">Loading document...</h2>
        </div>
      </ShellPage>
    );
  }

  const isDraft = doc.status === "draft";
  const draftTotals = data?.draftTotals;

  // For drafts: show computed live totals; for finalized docs: show frozen values.
  const display = isDraft
    ? {
        subtotal: draftTotals?.subtotal ?? 0,
        taxTotal: draftTotals?.taxTotal ?? 0,
        total: draftTotals?.total ?? 0,
      }
    : { subtotal: doc.subtotal, taxTotal: doc.taxTotal, total: doc.total };

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          items={[
            { title: "Documents", href: "/documents" },
            { title: `${doc.type} ${doc.folio ?? ""}`.trim() },
          ]}
        />
      </ShellHeader>

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg capitalize">
                  {doc.type.replace("_", " ")}
                </h2>
                <Badge variant={isDraft ? "secondary" : "default"}>
                  {doc.status}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {doc.entityName ?? "Walk-in"} ·{" "}
                {doc.folio !== null
                  ? `Folio #${doc.series ?? doc.type}-${doc.folio}`
                  : "No folio (draft)"}
              </p>
            </div>
            {isDraft && (
              <Button
                disabled={finalize.isPending || lines.length === 0}
                onClick={handleFinalize}
              >
                Finalize
              </Button>
            )}
          </div>

          <div>
            <h3 className="mb-2 font-medium text-sm">Line items</h3>
            <div className="divide-y rounded-lg border">
              {lines.map((l) => (
                <div
                  className="flex items-center gap-3 px-4 py-2 text-sm"
                  key={l.id}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {l.description}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {l.quantity} ×{" "}
                    {formatMoneyMinor(l.unitPrice, doc.currencyCode)}
                  </span>
                  <span className="w-24 text-right font-medium tabular-nums">
                    {formatMoneyMinor(
                      l.unitPrice * l.quantity,
                      doc.currencyCode
                    )}
                  </span>
                </div>
              ))}
              {lines.length === 0 && (
                <div className="px-4 py-6 text-center text-muted-foreground text-xs">
                  No lines yet.
                </div>
              )}
            </div>
          </div>

          {isDraft && (
            <form
              className="grid grid-cols-1 gap-2 rounded-lg border p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]"
              onSubmit={handleAddLine}
            >
              <Input
                onChange={(e) =>
                  setLine((s) => ({ ...s, description: e.target.value }))
                }
                placeholder="Description"
                value={line.description}
              />
              <Input
                className="w-20"
                min={1}
                onChange={(e) =>
                  setLine((s) => ({
                    ...s,
                    quantity: Number(e.target.value) || 1,
                  }))
                }
                placeholder="Qty"
                type="number"
                value={line.quantity}
              />
              <Input
                className="w-28"
                min={0}
                onChange={(e) =>
                  setLine((s) => ({
                    ...s,
                    unitPrice: Number(e.target.value) || 0,
                  }))
                }
                placeholder="Unit price (minor)"
                type="number"
                value={line.unitPrice}
              />
              <Input
                className="w-24"
                min={0}
                onChange={(e) =>
                  setLine((s) => ({
                    ...s,
                    taxRate: Number(e.target.value) || 0,
                  }))
                }
                placeholder="Tax (bps)"
                type="number"
                value={line.taxRate}
              />
              <Button type="submit">Add</Button>
            </form>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                {formatMoneyMinor(display.subtotal, doc.currencyCode)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span className="tabular-nums">
                {formatMoneyMinor(display.taxTotal, doc.currencyCode)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 font-medium">
              <span>Total</span>
              <span className="tabular-nums">
                {formatMoneyMinor(display.total, doc.currencyCode)}
              </span>
            </div>
            {!isDraft && (
              <>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Paid</span>
                  <span className="tabular-nums">
                    {formatMoneyMinor(doc.amountPaid, doc.currencyCode)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-medium tabular-nums">
                    {formatMoneyMinor(doc.balanceDue, doc.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge variant={paymentBadgeVariant(doc.paymentStatus)}>
                    {doc.paymentStatus}
                  </Badge>
                </div>
              </>
            )}
          </div>

          {!isDraft && doc.balanceDue > 0 && (
            <RecordPaymentForm disabled={false} docId={id} />
          )}

          <div>
            <h3 className="mb-2 font-medium text-sm">Activity</h3>
            <div className="divide-y rounded-lg border">
              {(activityResp?.data ?? []).map((event) => (
                <div className="px-4 py-2 text-sm" key={event.id}>
                  <div className="text-muted-foreground text-xs">
                    {format(new Date(event.createdAt), "MMM d, h:mm a")}
                  </div>
                  <div>{event.summary ?? event.eventType}</div>
                </div>
              ))}
              {(activityResp?.data ?? []).length === 0 && (
                <div className="px-4 py-4 text-center text-muted-foreground text-xs">
                  No activity yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ShellPage>
  );
}
