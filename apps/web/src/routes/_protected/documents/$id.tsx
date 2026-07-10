import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/shadcn/dialog";
import { Input } from "@workspace/ui/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/shadcn/select";
import {
  formatMajorInputValue,
  formatMoneyMinor,
  majorToMinor,
  minorToMajor,
  minorToMajorInput,
} from "@workspace/ui/lib/money";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  bpsToPercent,
  DocumentTypeBadge,
  documentFolioLabel,
  documentTypeLabel,
  percentToBps,
} from "@/components/documents/document-type";
import { PaymentStatusBadge } from "@/components/documents/payment-status-badge";
import { useSetPageContext } from "@/components/providers/page-context";
import {
  useAcceptDocument,
  useActivity,
  useAddLineItem,
  useApplyDisposition,
  useCreateSuccessor,
  useDocument,
  useFinalizeDocument,
  useRecordPayment,
  useRemoveLineItem,
  useUpdateLineItem,
} from "@/hooks/use-documents";
import { useProducts } from "@/hooks/use-products";

export const Route = createFileRoute("/_protected/documents/$id")({
  component: DocumentPage,
});

function DocumentEntityLabel({
  entityId,
  entityName,
}: {
  entityId: string | null;
  entityName: string | null;
}) {
  if (entityId) {
    return (
      <Link
        className="hover:text-primary hover:underline"
        params={{ id: entityId }}
        to="/entities/$id"
      >
        {entityName ?? "Entity"}
      </Link>
    );
  }
  return <>{entityName ?? "Walk-in"}</>;
}

function RecordPaymentForm({
  docId,
  balanceDue,
  currencyCode,
}: {
  docId: string;
  balanceDue: number;
  currencyCode: string;
}) {
  const recordPayment = useRecordPayment();
  const [method, setMethod] = useState("cash");
  const [amountMajor, setAmountMajor] = useState(
    minorToMajorInput(balanceDue, currencyCode)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = majorToMinor(amountMajor, currencyCode);
    if (amount <= 0 || amount > balanceDue) {
      return;
    }
    await recordPayment.mutateAsync({
      input: {
        amount,
        method,
        allocations: [{ documentId: docId, amount }],
      },
    });
  };

  return (
    <form className="space-y-2 rounded-lg border p-4" onSubmit={handleSubmit}>
      <h3 className="font-medium text-sm">Record payment</h3>
      <p className="text-muted-foreground text-xs">
        Balance due {formatMoneyMinor(balanceDue, currencyCode)}. Amount cannot
        exceed balance due.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          onValueChange={(value) => {
            if (value != null) {
              setMethod(value);
            }
          }}
          value={method}
        >
          <SelectTrigger className="w-full sm:w-32">
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
          max={minorToMajor(balanceDue, currencyCode)}
          min={0}
          onChange={(e) => setAmountMajor(Number(e.target.value) || 0)}
          step="0.01"
          type="number"
          value={formatMajorInputValue(amountMajor, currencyCode)}
        />
        <Button
          disabled={
            recordPayment.isPending ||
            amountMajor <= 0 ||
            majorToMinor(amountMajor, currencyCode) > balanceDue
          }
          type="submit"
        >
          Pay
        </Button>
      </div>
    </form>
  );
}

function DraftLineEditor({
  docId,
  currencyCode,
}: {
  docId: string;
  currencyCode: string;
}) {
  const addLineItem = useAddLineItem();
  const updateLineItem = useUpdateLineItem();
  const removeLineItem = useRemoveLineItem();
  const { data: productsResp } = useProducts({
    page: 1,
    pageSize: 50,
    sortOrder: "asc",
  });
  const { data } = useDocument(docId);
  const lines = data?.lines ?? [];

  const [draft, setDraft] = useState({
    productId: "",
    description: "",
    quantity: 1,
    unitPriceMajor: 0,
    taxPercent: 0,
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.description.trim()) {
      return;
    }
    await addLineItem.mutateAsync({
      id: docId,
      data: {
        productId: draft.productId || undefined,
        description: draft.description,
        quantity: draft.quantity,
        unitPrice: majorToMinor(draft.unitPriceMajor, currencyCode),
        taxRate: percentToBps(draft.taxPercent),
      },
    });
    setDraft({
      productId: "",
      description: "",
      quantity: 1,
      unitPriceMajor: 0,
      taxPercent: 0,
    });
  };

  const pickProduct = (productId: string) => {
    const product = productsResp?.data.find((p) => p.id === productId);
    if (!product) {
      setDraft((s) => ({ ...s, productId: "" }));
      return;
    }
    setDraft((s) => ({
      ...s,
      productId,
      description: product.name,
      unitPriceMajor: minorToMajorInput(product.price ?? 0, currencyCode),
    }));
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Line items</h3>
      <div className="divide-y rounded-lg border">
        {lines.map((line) => (
          <div
            className="grid grid-cols-1 gap-2 px-3 py-2 sm:grid-cols-[1fr_5rem_7rem_5rem_auto] sm:items-center"
            key={line.id}
          >
            <Input
              defaultValue={line.description}
              onBlur={(e) => {
                const description = e.target.value.trim();
                if (description && description !== line.description) {
                  updateLineItem.mutate({
                    id: docId,
                    lineId: line.id,
                    data: { description },
                  });
                }
              }}
            />
            <Input
              defaultValue={Math.abs(line.quantity)}
              min={1}
              onBlur={(e) => {
                const quantity = Math.abs(Number(e.target.value) || 1);
                if (quantity !== Math.abs(line.quantity)) {
                  updateLineItem.mutate({
                    id: docId,
                    lineId: line.id,
                    data: { quantity },
                  });
                }
              }}
              type="number"
            />
            <Input
              defaultValue={formatMajorInputValue(
                minorToMajor(line.unitPrice, currencyCode),
                currencyCode
              )}
              min={0}
              onBlur={(e) => {
                const unitPrice = majorToMinor(
                  Number(e.target.value) || 0,
                  currencyCode
                );
                if (unitPrice !== line.unitPrice) {
                  updateLineItem.mutate({
                    id: docId,
                    lineId: line.id,
                    data: { unitPrice },
                  });
                }
              }}
              step="0.01"
              type="number"
            />
            <Input
              defaultValue={bpsToPercent(line.taxRate)}
              min={0}
              onBlur={(e) => {
                const taxRate = percentToBps(Number(e.target.value) || 0);
                if (taxRate !== line.taxRate) {
                  updateLineItem.mutate({
                    id: docId,
                    lineId: line.id,
                    data: { taxRate },
                  });
                }
              }}
              step="0.01"
              type="number"
            />
            <Button
              aria-label="Remove line"
              onClick={() =>
                removeLineItem.mutate({ id: docId, lineId: line.id })
              }
              size="icon"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {lines.length === 0 && (
          <div className="px-4 py-6 text-center text-muted-foreground text-xs">
            No lines yet.
          </div>
        )}
      </div>

      <form
        className="grid grid-cols-1 gap-2 rounded-lg border p-3 sm:grid-cols-[8rem_1fr_5rem_7rem_5rem_auto]"
        onSubmit={handleAdd}
      >
        <Select
          onValueChange={(value) => {
            if (value != null) {
              pickProduct(value);
            }
          }}
          value={draft.productId || undefined}
        >
          <SelectTrigger>
            <SelectValue placeholder="Product" />
          </SelectTrigger>
          <SelectContent>
            {(productsResp?.data ?? []).map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          onChange={(e) =>
            setDraft((s) => ({ ...s, description: e.target.value }))
          }
          placeholder="Description"
          value={draft.description}
        />
        <Input
          min={1}
          onChange={(e) =>
            setDraft((s) => ({
              ...s,
              quantity: Number(e.target.value) || 1,
            }))
          }
          type="number"
          value={draft.quantity}
        />
        <Input
          min={0}
          onChange={(e) =>
            setDraft((s) => ({
              ...s,
              unitPriceMajor: Number(e.target.value) || 0,
            }))
          }
          placeholder="Price"
          step="0.01"
          type="number"
          value={formatMajorInputValue(draft.unitPriceMajor, currencyCode)}
        />
        <Input
          min={0}
          onChange={(e) =>
            setDraft((s) => ({
              ...s,
              taxPercent: Number(e.target.value) || 0,
            }))
          }
          placeholder="Tax %"
          step="0.01"
          type="number"
          value={draft.taxPercent}
        />
        <Button disabled={addLineItem.isPending} type="submit">
          <Plus className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function DocumentHeaderActions({
  id,
  doc,
  lineCount,
  onCreateCreditNote,
}: {
  id: string;
  doc: NonNullable<ReturnType<typeof useDocument>["data"]>["doc"];
  lineCount: number;
  onCreateCreditNote: () => void;
}) {
  const navigate = useNavigate();
  const finalize = useFinalizeDocument();
  const accept = useAcceptDocument();
  const createSuccessor = useCreateSuccessor();
  const isDraft = doc.status === "draft";
  const isQuote = doc.type === "quote";

  const handleConvert = async () => {
    const result = await createSuccessor.mutateAsync({
      id,
      data: { type: "invoice" },
    });
    navigate({ to: "/documents/$id", params: { id: result.doc.id } });
  };

  return (
    <ShellHeaderActions>
      {isDraft && isQuote && (
        <Button
          disabled={accept.isPending || lineCount === 0}
          onClick={() => accept.mutate(id)}
          size="sm"
        >
          Accept quote
        </Button>
      )}
      {isDraft && !isQuote && (
        <Button
          disabled={finalize.isPending || lineCount === 0}
          onClick={() => finalize.mutate(id)}
          size="sm"
        >
          Finalize
        </Button>
      )}
      {doc.status === "accepted" && isQuote && (
        <Button
          disabled={createSuccessor.isPending}
          onClick={handleConvert}
          size="sm"
        >
          Convert to invoice
        </Button>
      )}
      {doc.status === "finalized" && doc.type === "invoice" && (
        <Button onClick={onCreateCreditNote} size="sm" variant="outline">
          Create credit note
        </Button>
      )}
    </ShellHeaderActions>
  );
}

function FrozenLineItems({
  lines,
  currencyCode,
}: {
  lines: NonNullable<ReturnType<typeof useDocument>["data"]>["lines"];
  currencyCode: string;
}) {
  return (
    <div>
      <h3 className="mb-2 font-medium text-sm">Line items</h3>
      <div className="divide-y rounded-lg border">
        {lines.map((line) => (
          <div
            className="flex items-center gap-3 px-4 py-2 text-sm"
            key={line.id}
          >
            <span className="min-w-0 flex-1 truncate">{line.description}</span>
            <span className="text-muted-foreground tabular-nums">
              {line.quantity} × {formatMoneyMinor(line.unitPrice, currencyCode)}
              {line.taxRate > 0 ? ` · ${bpsToPercent(line.taxRate)}% tax` : ""}
            </span>
            <span className="w-24 text-right font-medium tabular-nums">
              {formatMoneyMinor(line.unitPrice * line.quantity, currencyCode)}
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
  );
}

function DocumentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useDocument(id);
  const { data: activityResp } = useActivity(id);
  const createSuccessor = useCreateSuccessor();
  const applyDisposition = useApplyDisposition();

  const doc = data?.doc;
  const lines = data?.lines ?? [];

  const [creditOpen, setCreditOpen] = useState(false);
  const [disposition, setDisposition] = useState<
    "cash_refund" | "store_credit" | "apply_to_document"
  >("store_credit");

  useSetPageContext(
    useMemo(
      () => ({
        title: doc
          ? `${documentTypeLabel(doc.type)} ${doc.folio ?? ""}`
          : "Document",
        description: doc?.entityName ?? undefined,
        entityType: "document",
        entityId: id,
      }),
      [doc, id]
    )
  );

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
  const isCreditNote = doc.type === "credit_note";
  const isFiscalPayable =
    doc.type === "invoice" || doc.type === "bill" || doc.type === "credit_note";
  const draftTotals = data?.draftTotals;
  const display = isDraft
    ? {
        subtotal: draftTotals?.subtotal ?? 0,
        taxTotal: draftTotals?.taxTotal ?? 0,
        total: draftTotals?.total ?? 0,
      }
    : { subtotal: doc.subtotal, taxTotal: doc.taxTotal, total: doc.total };

  const handleCreateCreditNote = async () => {
    const result = await createSuccessor.mutateAsync({
      id,
      data: { type: "credit_note" },
    });
    setCreditOpen(false);
    navigate({ to: "/documents/$id", params: { id: result.doc.id } });
  };

  const handleApplyDisposition = async () => {
    await applyDisposition.mutateAsync({
      id,
      disposition,
      ...(disposition === "apply_to_document" &&
        doc.sourceDocumentId && {
          targetDocumentId: doc.sourceDocumentId,
        }),
    });
  };

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          items={[
            { title: "Documents", href: "/documents" },
            {
              title: `${documentTypeLabel(doc.type)} ${documentFolioLabel(doc)}`,
            },
          ]}
        />
        <DocumentHeaderActions
          doc={doc}
          id={id}
          lineCount={lines.length}
          onCreateCreditNote={() => setCreditOpen(true)}
        />
      </ShellHeader>

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold text-lg">
                  {documentTypeLabel(doc.type)}
                </h2>
                <DocumentTypeBadge type={doc.type} />
                <Badge variant={isDraft ? "secondary" : "default"}>
                  {doc.status}
                </Badge>
                {!isDraft && isFiscalPayable && (
                  <PaymentStatusBadge status={doc.paymentStatus} />
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                <DocumentEntityLabel
                  entityId={doc.entityId}
                  entityName={doc.entityName}
                />{" "}
                · {documentFolioLabel(doc)}
              </p>
              {doc.sourceDocumentId && (
                <p className="mt-1 text-muted-foreground text-xs">
                  {isCreditNote ? "Credit for" : "Converted from"}{" "}
                  <Link
                    className="hover:text-primary hover:underline"
                    params={{ id: doc.sourceDocumentId }}
                    to="/documents/$id"
                  >
                    source document
                  </Link>
                </p>
              )}
            </div>
          </div>

          {isDraft ? (
            <DraftLineEditor currencyCode={doc.currencyCode} docId={id} />
          ) : (
            <FrozenLineItems currencyCode={doc.currencyCode} lines={lines} />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 font-medium text-sm">Totals</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">
                  {formatMoneyMinor(display.subtotal, doc.currencyCode)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="tabular-nums">
                  {formatMoneyMinor(display.taxTotal, doc.currencyCode)}
                </dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatMoneyMinor(display.total, doc.currencyCode)}
                </dd>
              </div>
              {!isDraft && isFiscalPayable && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Amount paid</dt>
                    <dd className="tabular-nums">
                      {formatMoneyMinor(doc.amountPaid, doc.currencyCode)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Balance due</dt>
                    <dd className="tabular-nums">
                      {formatMoneyMinor(doc.balanceDue, doc.currencyCode)}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {doc.status === "finalized" &&
            (doc.type === "invoice" || doc.type === "bill") &&
            doc.balanceDue > 0 && (
              <RecordPaymentForm
                balanceDue={doc.balanceDue}
                currencyCode={doc.currencyCode}
                docId={id}
              />
            )}

          {isCreditNote &&
            doc.status === "finalized" &&
            doc.balanceDue !== 0 && (
              <div className="space-y-2 rounded-lg border p-4">
                <h3 className="font-medium text-sm">Disposition</h3>
                <Select
                  onValueChange={(v) => {
                    if (v == null) {
                      return;
                    }
                    setDisposition(
                      v as "cash_refund" | "store_credit" | "apply_to_document"
                    );
                  }}
                  value={disposition}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_credit">Store credit</SelectItem>
                    <SelectItem value="cash_refund">Cash refund</SelectItem>
                    <SelectItem value="apply_to_document">
                      Apply to source invoice
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={applyDisposition.isPending}
                  onClick={handleApplyDisposition}
                >
                  Apply disposition
                </Button>
              </div>
            )}

          <div className="rounded-lg border p-4 text-muted-foreground text-xs">
            Created {format(new Date(doc.createdAt), "MMM d, yyyy h:mm a")}
            {!isDraft && " · Lines and totals are frozen"}
          </div>

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

      <Dialog onOpenChange={setCreditOpen} open={creditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create credit note</DialogTitle>
            <DialogDescription>
              Creates a draft credit note with copied (reversed) lines from this
              invoice. Choose disposition after you finalize it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={createSuccessor.isPending}
              onClick={handleCreateCreditNote}
            >
              Create draft credit note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ShellPage>
  );
}
