import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/shadcn/alert-dialog";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { DEFAULT_CURRENCY, formatMoneyMinor } from "@workspace/ui/lib/money";
import { format } from "date-fns";
import { Archive, FileText, Pencil, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  EntityForm,
  type EntityFormValues,
} from "@/components/entities/entity-form";
import { useSetPageContext } from "@/components/providers/page-context";
import { WalletCard } from "@/components/wallet/wallet-card";
import { useDocuments } from "@/hooks/use-documents";
import {
  useArchiveEntity,
  useEntity,
  useUpdateEntity,
} from "@/hooks/use-entities";

export const Route = createFileRoute("/_protected/entities/$id")({
  component: EntityPage,
});

function EntityPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);

  const { id: entityId } = Route.useParams();
  const navigate = useNavigate();

  const { data: entity, isLoading } = useEntity(entityId || "");
  const updateEntity = useUpdateEntity();
  const archiveEntity = useArchiveEntity();
  const { data: docsResp } = useDocuments(undefined, entityId);

  useSetPageContext(
    useMemo(
      () => ({
        title: entity?.name ?? "Entity",
        description: entity?.type,
        entityType: "entity",
        entityId,
      }),
      [entity, entityId]
    )
  );

  const onSubmit = async (data: EntityFormValues) => {
    await updateEntity.mutateAsync({
      id: entityId,
      data: {
        name: data.name,
        type: data.type,
        creditLimit: data.creditLimit ?? null,
      },
    });
    setIsEditing(false);
  };

  const handleArchive = async () => {
    await archiveEntity.mutateAsync(entityId);
    setIsArchiveDialogOpen(false);
    navigate({ to: "/entities" });
  };

  if (isLoading || !entity) {
    return (
      <ShellPage>
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <h2 className="font-semibold text-xl">
            {isLoading ? "Loading entity..." : "Entity not found"}
          </h2>
        </div>
      </ShellPage>
    );
  }

  const isArchived = Boolean(entity.archivedAt);
  const docs = docsResp?.data ?? [];

  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          items={[
            { title: "Entities", href: "/entities" },
            { title: entity.name },
          ]}
        />
        <ShellHeaderActions>
          {isEditing ? (
            <Button
              aria-label="Cancel"
              onClick={() => setIsEditing(false)}
              size="sm"
              variant="ghost"
            >
              <X className="size-4" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
          ) : (
            <>
              {!isArchived && (
                <Button
                  aria-label="Edit"
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  variant="outline"
                >
                  <Pencil className="size-4" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
              {!isArchived && (
                <Button
                  aria-label="Archive"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setIsArchiveDialogOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <Archive className="size-4" />
                  <span className="hidden sm:inline">Archive</span>
                </Button>
              )}
            </>
          )}
        </ShellHeaderActions>
      </ShellHeader>

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>{entity.name}</CardTitle>
                <Badge className="capitalize" variant="secondary">
                  {entity.type.replace("_", " ")}
                </Badge>
                {isArchived && <Badge variant="outline">Archived</Badge>}
              </div>
              <CardDescription>
                Balance {formatMoneyMinor(entity.balance, DEFAULT_CURRENCY)}
                {entity.creditLimit == null
                  ? ""
                  : ` · Credit limit ${formatMoneyMinor(entity.creditLimit, DEFAULT_CURRENCY)}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <EntityForm
                  defaultValues={{
                    name: entity.name,
                    type: entity.type,
                    creditLimit: entity.creditLimit,
                  }}
                  isLoading={updateEntity.isPending}
                  onSubmit={onSubmit}
                  submitLabel="Save changes"
                />
              ) : (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="capitalize">
                      {entity.type.replace("_", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">AR balance</dt>
                    <dd className="tabular-nums">
                      {formatMoneyMinor(entity.balance, DEFAULT_CURRENCY)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Store credit</dt>
                    <dd className="tabular-nums">
                      {formatMoneyMinor(entity.creditBalance, DEFAULT_CURRENCY)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Credit limit</dt>
                    <dd className="tabular-nums">
                      {entity.creditLimit == null
                        ? "None"
                        : formatMoneyMinor(
                            entity.creditLimit,
                            DEFAULT_CURRENCY
                          )}
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h2 className="font-medium text-sm">Documents</h2>
            {docs.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground text-sm">
                No documents linked to this entity yet.
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
                      <div className="font-medium capitalize">
                        {doc.type.replace("_", " ")}
                        {doc.folio === null
                          ? ""
                          : ` #${doc.series ?? doc.type}-${doc.folio}`}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {format(new Date(doc.createdAt), "MMM d, yyyy")}
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
                      {formatMoneyMinor(
                        doc.status === "finalized" ? doc.balanceDue : doc.total,
                        doc.currencyCode
                      )}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <WalletCard
          creditBalance={entity.creditBalance}
          entityId={entityId}
          isArchived={isArchived}
        />
      </div>

      <AlertDialog
        onOpenChange={setIsArchiveDialogOpen}
        open={isArchiveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this entity?</AlertDialogTitle>
            <AlertDialogDescription>
              Archived entities leave the picker and default directory, but
              historical documents keep their linked name.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ShellPage>
  );
}
