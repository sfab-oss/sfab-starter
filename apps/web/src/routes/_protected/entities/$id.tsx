import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import {
  ShellHeader,
  ShellHeaderActions,
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
  documentStatusLabel,
  documentTypeLabel,
} from "@/components/documents/document-type";
import {
  EntityForm,
  type EntityFormValues,
} from "@/components/entities/entity-form";
import { ShellHeaderSidebarTrigger } from "@/components/layout/shell-header-sidebar-trigger";
import { useSetPageContext } from "@/components/providers/page-context";
import { WalletCard } from "@/components/wallet/wallet-card";
import { useDocuments } from "@/hooks/use-documents";
import {
  useArchiveEntity,
  useEntity,
  useUpdateEntity,
} from "@/hooks/use-entities";
import { dateFnsLocale, intlLocale } from "@/lib/locale";
import { m } from "@/paraglide/messages.js";

export const Route = createFileRoute("/_protected/entities/$id")({
  component: EntityPage,
});

function entityTypeLabel(type: string): string {
  switch (type) {
    case "customer":
      return m.entities_type_customer();
    case "supplier":
      return m.entities_type_supplier();
    case "walk_in":
      return m.documents_walk_in();
    default:
      return type.replaceAll("_", " ");
  }
}

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
        title: entity?.name ?? m.entities_singular(),
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
            {isLoading ? m.entities_loading() : m.entities_not_found()}
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
          ellipsisAriaLabel={m.breadcrumb_ellipsis_aria()}
          homeLabel={m.nav_home()}
          items={[
            { title: m.entities_title(), href: "/entities" },
            { title: entity.name },
          ]}
        />
        <ShellHeaderActions>
          {isEditing ? (
            <Button
              aria-label={m.common_cancel()}
              onClick={() => setIsEditing(false)}
              size="sm"
              variant="ghost"
            >
              <X className="size-4" />
              <span className="hidden sm:inline">{m.common_cancel()}</span>
            </Button>
          ) : (
            <>
              {!isArchived && (
                <Button
                  aria-label={m.common_edit()}
                  onClick={() => setIsEditing(true)}
                  size="sm"
                  variant="outline"
                >
                  <Pencil className="size-4" />
                  <span className="hidden sm:inline">{m.common_edit()}</span>
                </Button>
              )}
              {!isArchived && (
                <Button
                  aria-label={m.common_archive()}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setIsArchiveDialogOpen(true)}
                  size="sm"
                  variant="outline"
                >
                  <Archive className="size-4" />
                  <span className="hidden sm:inline">{m.common_archive()}</span>
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
                  {entityTypeLabel(entity.type)}
                </Badge>
                {isArchived && (
                  <Badge variant="outline">{m.entities_archived()}</Badge>
                )}
              </div>
              <CardDescription>
                {m.documents_label_balance()}{" "}
                {formatMoneyMinor(entity.balance, DEFAULT_CURRENCY, {
                  locale: intlLocale(),
                })}
                {entity.creditLimit == null
                  ? ""
                  : ` · ${m.entities_credit_limit()} ${formatMoneyMinor(entity.creditLimit, DEFAULT_CURRENCY, { locale: intlLocale() })}`}
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
                  mode="edit"
                  onSubmit={onSubmit}
                />
              ) : (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">
                      {m.entities_type()}
                    </dt>
                    <dd className="capitalize">
                      {entityTypeLabel(entity.type)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {m.entities_ar_balance()}
                    </dt>
                    <dd className="tabular-nums">
                      {formatMoneyMinor(entity.balance, DEFAULT_CURRENCY, {
                        locale: intlLocale(),
                      })}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {m.entities_store_credit()}
                    </dt>
                    <dd className="tabular-nums">
                      {formatMoneyMinor(
                        entity.creditBalance,
                        DEFAULT_CURRENCY,
                        { locale: intlLocale() }
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {m.entities_credit_limit()}
                    </dt>
                    <dd className="tabular-nums">
                      {entity.creditLimit == null
                        ? m.common_none()
                        : formatMoneyMinor(
                            entity.creditLimit,
                            DEFAULT_CURRENCY,
                            { locale: intlLocale() }
                          )}
                    </dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h2 className="font-medium text-sm">{m.documents_title()}</h2>
            {docs.length === 0 ? (
              <div className="rounded-lg border border-dashed py-10 text-center text-muted-foreground text-sm">
                {m.entities_no_documents()}
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
                        {documentTypeLabel(doc.type)}
                        {doc.folio === null
                          ? ""
                          : ` #${doc.series ?? doc.type}-${doc.folio}`}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {format(new Date(doc.createdAt), "MMM d, yyyy", {
                          locale: dateFnsLocale(),
                        })}
                      </div>
                    </div>
                    <Badge
                      variant={
                        doc.status === "finalized" ? "default" : "secondary"
                      }
                    >
                      {documentStatusLabel(doc.status)}
                    </Badge>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatMoneyMinor(
                        doc.status === "finalized" ? doc.balanceDue : doc.total,
                        doc.currencyCode,
                        { locale: intlLocale() }
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
            <AlertDialogTitle>{m.entities_archive_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.entities_archive_description()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>
              {m.common_archive()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ShellPage>
  );
}
