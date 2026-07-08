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
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/shadcn/dialog";
import { Field, FieldLabel } from "@workspace/ui/components/shadcn/field";
import { formatMoneyMinor } from "@workspace/ui/lib/money";
import { format } from "date-fns";
import { FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  EntityPicker,
  type EntityPickerValue,
} from "@/components/entities/entity-picker";
import { useSetPageContext } from "@/components/providers/page-context";
import {
  useActivity,
  useCreateDocument,
  useDocuments,
} from "@/hooks/use-documents";

export const Route = createFileRoute("/_protected/documents/")({
  component: DocumentsPage,
});

function DocumentsPage() {
  const navigate = useNavigate();
  const { data: docsResp } = useDocuments();
  const { data: activityResp } = useActivity();
  const createDocument = useCreateDocument();
  const [createOpen, setCreateOpen] = useState(false);
  const [entityValue, setEntityValue] = useState<EntityPickerValue>({
    kind: "walk_in",
    name: "Walk-in",
  });

  useSetPageContext(
    useMemo(
      () => ({
        title: "Documents",
        description: "Quotes, orders, invoices",
        entityType: "documents",
        entityId: "list",
      }),
      []
    )
  );

  const handleNewInvoice = async () => {
    const payload =
      entityValue?.kind === "entity"
        ? {
            type: "invoice" as const,
            direction: "sales" as const,
            entityId: entityValue.entity.id,
          }
        : {
            type: "invoice" as const,
            direction: "sales" as const,
            entityName:
              entityValue?.kind === "walk_in" ? entityValue.name : "Walk-in",
          };

    const doc = await createDocument.mutateAsync(payload);
    setCreateOpen(false);
    navigate({ to: "/documents/$id", params: { id: doc.id } });
  };

  const docs = docsResp?.data ?? [];

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs items={[{ title: "Documents" }]} />
        <ShellHeaderActions>
          <Dialog onOpenChange={setCreateOpen} open={createOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px]">
              <DialogHeader>
                <DialogTitle>New invoice</DialogTitle>
                <DialogDescription>
                  Pick an existing entity or keep Walk-in for an ad-hoc name.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <Field>
                  <FieldLabel>Customer / entity</FieldLabel>
                  <EntityPicker onChange={setEntityValue} value={entityValue} />
                </Field>
              </DialogBody>
              <DialogFooter>
                <Button
                  disabled={createDocument.isPending}
                  onClick={handleNewInvoice}
                >
                  {createDocument.isPending ? "Creating…" : "Create invoice"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ShellHeaderActions>
      </ShellHeader>

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          <h2 className="font-medium text-sm">Recent documents</h2>
          {docs.length === 0 ? (
            <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground text-sm">
              No documents yet. Create an invoice to see the hub in action.
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {docs.map((doc) => (
                <Link
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50"
                  key={doc.id}
                  params={{ id: doc.id }}
                  to="/documents/$id"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">
                        {doc.type.replace("_", " ")}
                      </span>
                      {doc.folio !== null && (
                        <span className="text-muted-foreground text-xs">
                          #{doc.series ?? doc.type}-{doc.folio}
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {doc.entityName ?? "Walk-in"}
                    </div>
                  </div>
                  <Badge
                    variant={
                      doc.status === "finalized" ? "default" : "secondary"
                    }
                  >
                    {doc.status}
                  </Badge>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatMoneyMinor(doc.total, doc.currencyCode)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="font-medium text-sm">Activity</h2>
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
              <div className="px-4 py-6 text-center text-muted-foreground text-xs">
                No activity yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </ShellPage>
  );
}
