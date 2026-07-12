import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellHeader,
  ShellHeaderActions,
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
import {
  bpsToPercent,
  DocumentTypeBadge,
  documentFolioLabel,
  documentStatusLabel,
  documentTypeLabel,
} from "@/components/documents/document-type";
import { DraftLineEditor } from "@/components/documents/draft-line-editor";
import { PaymentStatusBadge } from "@/components/documents/payment-status-badge";
import { RecordPaymentDialog } from "@/components/documents/record-payment-dialog";
import { ShellHeaderSidebarTrigger } from "@/components/layout/shell-header-sidebar-trigger";
import { useSetPageContext } from "@/components/providers/page-context";
import { PayFromCreditForm } from "@/components/wallet/pay-from-credit-form";
import {
  useAcceptDocument,
  useActivity,
  useApplyDisposition,
  useCreateSuccessor,
  useDocument,
  useFinalizeDocument,
} from "@/hooks/use-documents";
import { useEntity } from "@/hooks/use-entities";
import { dateFnsLocale, intlLocale } from "@/lib/locale";
import { m } from "@/paraglide/messages.js";

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
        {entityName ?? m.documents_entity()}
      </Link>
    );
  }
  return <>{entityName ?? m.documents_walk_in()}</>;
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
          {m.documents_accept_quote()}
        </Button>
      )}
      {isDraft && !isQuote && (
        <Button
          disabled={finalize.isPending || lineCount === 0}
          onClick={() => finalize.mutate(id)}
          size="sm"
        >
          {m.documents_finalize()}
        </Button>
      )}
      {doc.status === "accepted" && isQuote && (
        <Button
          disabled={createSuccessor.isPending}
          onClick={handleConvert}
          size="sm"
        >
          {m.documents_convert_to_invoice()}
        </Button>
      )}
      {doc.status === "finalized" && doc.type === "invoice" && (
        <Button onClick={onCreateCreditNote} size="sm" variant="outline">
          {m.documents_create_credit_note()}
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
      <h3 className="mb-2 font-medium text-sm">{m.documents_line_items()}</h3>
      <div className="divide-y rounded-lg border">
        {lines.map((line) => (
          <div
            className="flex items-center gap-3 px-4 py-2 text-sm"
            key={line.id}
          >
            <span className="min-w-0 flex-1 truncate">{line.description}</span>
            <span className="text-muted-foreground tabular-nums">
              {line.quantity} ×{" "}
              {formatMoneyMinor(line.unitPrice, currencyCode, {
                locale: intlLocale(),
              })}
              {line.taxRate > 0
                ? ` · ${m.documents_tax_rate({ percent: String(bpsToPercent(line.taxRate)) })}`
                : ""}
            </span>
            <span className="w-24 text-right font-medium tabular-nums">
              {formatMoneyMinor(line.unitPrice * line.quantity, currencyCode, {
                locale: intlLocale(),
              })}
            </span>
          </div>
        ))}
        {lines.length === 0 && (
          <div className="px-4 py-6 text-center text-muted-foreground text-xs">
            {m.documents_no_lines()}
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentActions({
  docId,
  docType,
  entityId,
  entityName,
  folioLabel,
  total,
  amountPaid,
  balanceDue,
  currencyCode,
}: {
  docId: string;
  docType: string;
  entityId: string | null;
  entityName: string | null;
  folioLabel: string;
  total: number;
  amountPaid: number;
  balanceDue: number;
  currencyCode: string;
}) {
  const [paymentOpen, setPaymentOpen] = useState(false);
  const { data: entity } = useEntity(entityId ?? "");
  const creditBalance = entity?.creditBalance ?? 0;
  const showPayFromCredit =
    docType === "invoice" && Boolean(entityId) && creditBalance > 0;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-4">
        <h3 className="mb-1 font-medium text-sm">
          {m.documents_record_payment()}
        </h3>
        <p className="mb-3 text-muted-foreground text-xs">
          {m.documents_balance_due({
            amount: formatMoneyMinor(balanceDue, currencyCode, {
              locale: intlLocale(),
            }),
          })}
        </p>
        <Button className="w-full" onClick={() => setPaymentOpen(true)}>
          {m.documents_record_payment()}
        </Button>
      </div>
      {showPayFromCredit && entityId ? (
        <PayFromCreditForm
          balanceDue={balanceDue}
          creditBalance={creditBalance}
          currencyCode={currencyCode}
          docId={docId}
          entityId={entityId}
        />
      ) : null}
      <RecordPaymentDialog
        amountPaid={amountPaid}
        balanceDue={balanceDue}
        currencyCode={currencyCode}
        docId={docId}
        entityName={entityName}
        folioLabel={folioLabel}
        onOpenChange={setPaymentOpen}
        open={paymentOpen}
        total={total}
      />
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
          : m.documents_document(),
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
          <h2 className="font-semibold text-xl">{m.documents_loading()}</h2>
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
          ellipsisAriaLabel={m.breadcrumb_ellipsis_aria()}
          homeLabel={m.nav_home()}
          items={[
            { title: m.documents_title(), href: "/documents" },
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
                  {documentStatusLabel(doc.status)}
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
                  {isCreditNote
                    ? m.documents_credit_for()
                    : m.documents_converted_from()}{" "}
                  <Link
                    className="hover:text-primary hover:underline"
                    params={{ id: doc.sourceDocumentId }}
                    to="/documents/$id"
                  >
                    {m.documents_source_document()}
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
            <h3 className="mb-3 font-medium text-sm">{m.documents_totals()}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  {m.documents_subtotal()}
                </dt>
                <dd className="tabular-nums">
                  {formatMoneyMinor(display.subtotal, doc.currencyCode, {
                    locale: intlLocale(),
                  })}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{m.documents_tax()}</dt>
                <dd className="tabular-nums">
                  {formatMoneyMinor(display.taxTotal, doc.currencyCode, {
                    locale: intlLocale(),
                  })}
                </dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>{m.documents_column_total()}</dt>
                <dd className="tabular-nums">
                  {formatMoneyMinor(display.total, doc.currencyCode, {
                    locale: intlLocale(),
                  })}
                </dd>
              </div>
              {!isDraft && isFiscalPayable && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {m.documents_amount_paid()}
                    </dt>
                    <dd className="tabular-nums">
                      {formatMoneyMinor(doc.amountPaid, doc.currencyCode, {
                        locale: intlLocale(),
                      })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">
                      {m.documents_balance_due_label()}
                    </dt>
                    <dd className="tabular-nums">
                      {formatMoneyMinor(doc.balanceDue, doc.currencyCode, {
                        locale: intlLocale(),
                      })}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {doc.status === "finalized" &&
            (doc.type === "invoice" || doc.type === "bill") &&
            doc.balanceDue > 0 && (
              <PaymentActions
                amountPaid={doc.amountPaid}
                balanceDue={doc.balanceDue}
                currencyCode={doc.currencyCode}
                docId={id}
                docType={doc.type}
                entityId={doc.entityId}
                entityName={doc.entityName}
                folioLabel={documentFolioLabel(doc)}
                total={doc.total}
              />
            )}

          {isCreditNote &&
            doc.status === "finalized" &&
            doc.balanceDue !== 0 && (
              <div className="space-y-2 rounded-lg border p-4">
                <h3 className="font-medium text-sm">
                  {m.documents_disposition()}
                </h3>
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
                    <SelectItem value="store_credit">
                      {m.documents_disposition_store_credit()}
                    </SelectItem>
                    <SelectItem value="cash_refund">
                      {m.documents_disposition_cash_refund()}
                    </SelectItem>
                    <SelectItem value="apply_to_document">
                      {m.documents_disposition_apply_to_invoice()}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={applyDisposition.isPending}
                  onClick={handleApplyDisposition}
                >
                  {m.documents_apply_disposition()}
                </Button>
              </div>
            )}

          <div className="rounded-lg border p-4 text-muted-foreground text-xs">
            {m.documents_created({
              date: format(new Date(doc.createdAt), "MMM d, yyyy h:mm a", {
                locale: dateFnsLocale(),
              }),
            })}
            {!isDraft && ` · ${m.documents_lines_frozen()}`}
          </div>

          <div>
            <h3 className="mb-2 font-medium text-sm">
              {m.documents_activity()}
            </h3>
            <div className="divide-y rounded-lg border">
              {(activityResp?.data ?? []).map((event) => (
                <div className="px-4 py-2 text-sm" key={event.id}>
                  <div className="text-muted-foreground text-xs">
                    {format(new Date(event.createdAt), "MMM d, h:mm a", {
                      locale: dateFnsLocale(),
                    })}
                  </div>
                  <div>{event.summary ?? event.eventType}</div>
                </div>
              ))}
              {(activityResp?.data ?? []).length === 0 && (
                <div className="px-4 py-4 text-center text-muted-foreground text-xs">
                  {m.documents_no_activity()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog onOpenChange={setCreditOpen} open={creditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.documents_create_credit_note()}</DialogTitle>
            <DialogDescription>
              {m.documents_create_credit_note_description()}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={createSuccessor.isPending}
              onClick={handleCreateCreditNote}
            >
              {m.documents_create_draft_credit_note()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ShellPage>
  );
}
