"use client";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import {
  createableDocumentTypeSchema,
  listDocumentsQuerySchema,
} from "@workspace/contract/transaction";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import { ResourceTable } from "@workspace/ui/components/brand/resource-table";
import {
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { SortableHeader } from "@workspace/ui/components/brand/sortable-header";
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
} from "@workspace/ui/components/shadcn/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { Field, FieldLabel } from "@workspace/ui/components/shadcn/field";
import { formatMoneyMinor } from "@workspace/ui/lib/money";
import {
  getColumnFilterValue,
  type TableFilterDefinition,
} from "@workspace/ui/lib/table-filter-types";
import { format } from "date-fns";
import { ChevronDown, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
  DocumentTypeBadge,
  documentFolioLabel,
  documentTypeLabel,
} from "@/components/documents/document-type";
import { PaymentStatusBadge } from "@/components/documents/payment-status-badge";
import {
  EntityPicker,
  type EntityPickerValue,
} from "@/components/entities/entity-picker";
import { useSetPageContext } from "@/components/providers/page-context";
import {
  type DocumentRow,
  useCreateDocument,
  useDocumentsList,
} from "@/hooks/use-documents";
export const Route = createFileRoute("/_protected/documents/")({
  component: DocumentsPage,
  validateSearch: listDocumentsQuerySchema,
});
const DOCUMENT_FILTER_DEFINITIONS: TableFilterDefinition[] = [
  {
    id: "search",
    columnId: "search",
    label: "Search",
    type: "text",
    placeholder: "Entity, folio…",
  },
  {
    id: "type",
    columnId: "type",
    label: "Type",
    type: "enum",
    options: [
      {
        label: "Quote",
        value: "quote",
      },
      {
        label: "Invoice",
        value: "invoice",
      },
      {
        label: "Credit note",
        value: "credit_note",
      },
      {
        label: "Bill",
        value: "bill",
      },
    ],
  },
  {
    id: "direction",
    columnId: "direction",
    label: "Direction",
    type: "enum",
    options: [
      {
        label: "Sales",
        value: "sales",
      },
      {
        label: "Purchase",
        value: "purchase",
      },
    ],
  },
  {
    id: "status",
    columnId: "status",
    label: "Status",
    type: "enum",
    options: [
      {
        label: "Draft",
        value: "draft",
      },
      {
        label: "Accepted",
        value: "accepted",
      },
      {
        label: "Converted",
        value: "converted",
      },
      {
        label: "Finalized",
        value: "finalized",
      },
    ],
  },
];
function firstEnumValue(value: unknown): string | undefined {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  if (typeof value === "string" && value) {
    return value;
  }
  return undefined;
}
const NEW_DOCUMENT_TYPES = createableDocumentTypeSchema.options;
function DocumentsPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({
    from: Route.fullPath,
  });
  const { data: docsResponse, isLoading } = useDocumentsList(searchParams);
  const createDocument = useCreateDocument();
  const [createType, setCreateType] = useState<
    (typeof NEW_DOCUMENT_TYPES)[number] | null
  >(null);
  const [entityValue, setEntityValue] = useState<EntityPickerValue>({
    kind: "walk_in",
    name: "Walk-in",
  });
  useSetPageContext(
    useMemo(
      () => ({
        title: "Documents",
        description: "Quotes, invoices, bills",
        entityType: "documents",
        entityId: "list",
      }),
      []
    )
  );
  const pagination = useMemo<PaginationState>(
    () => ({
      pageIndex: searchParams.page - 1,
      pageSize: searchParams.pageSize,
    }),
    [searchParams.page, searchParams.pageSize]
  );
  const onPaginationChange = useCallback(
    (updater: Updater<PaginationState>) => {
      const next =
        typeof updater === "function" ? updater(pagination) : updater;
      navigate({
        search: (prev) => ({
          ...prev,
          page: next.pageIndex + 1,
          pageSize: next.pageSize,
        }),
      });
    },
    [navigate, pagination]
  );
  const sorting = useMemo<SortingState>(
    () =>
      searchParams.sortBy
        ? [
            {
              id: searchParams.sortBy,
              desc: searchParams.sortOrder === "desc",
            },
          ]
        : [
            {
              id: "createdAt",
              desc: true,
            },
          ],
    [searchParams.sortBy, searchParams.sortOrder]
  );
  const onSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      navigate({
        search: (prev) => ({
          ...prev,
          sortBy: next[0]?.id,
          sortOrder: next[0]?.desc ? ("desc" as const) : ("asc" as const),
          page: 1,
        }),
      });
    },
    [navigate, sorting]
  );
  const columnFilters = useMemo<ColumnFiltersState>(() => {
    const filters: ColumnFiltersState = [];
    if (searchParams.search) {
      filters.push({
        id: "search",
        value: searchParams.search,
      });
    }
    if (searchParams.type) {
      filters.push({
        id: "type",
        value: [searchParams.type],
      });
    }
    if (searchParams.direction) {
      filters.push({
        id: "direction",
        value: [searchParams.direction],
      });
    }
    if (searchParams.status) {
      filters.push({
        id: "status",
        value: [searchParams.status],
      });
    }
    return filters;
  }, [
    searchParams.search,
    searchParams.type,
    searchParams.direction,
    searchParams.status,
  ]);
  const onColumnFiltersChange = useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      const next =
        typeof updater === "function" ? updater(columnFilters) : updater;
      const searchValue = getColumnFilterValue(next, "search");
      const typeValue = firstEnumValue(getColumnFilterValue(next, "type"));
      const directionValue = firstEnumValue(
        getColumnFilterValue(next, "direction")
      );
      const statusValue = firstEnumValue(getColumnFilterValue(next, "status"));
      navigate({
        search: (prev) => ({
          ...prev,
          search:
            typeof searchValue === "string" && searchValue.trim()
              ? searchValue
              : undefined,
          type: (typeValue as typeof searchParams.type) || undefined,
          direction:
            (directionValue as typeof searchParams.direction) || undefined,
          status: (statusValue as typeof searchParams.status) || undefined,
          page: 1,
        }),
      });
    },
    [columnFilters, navigate]
  );
  const clearFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        type: undefined,
        direction: undefined,
        status: undefined,
        page: 1,
      }),
    });
  }, [navigate]);
  const pageCount = docsResponse
    ? Math.ceil(docsResponse.total / searchParams.pageSize)
    : 0;
  const hasActiveFilters = Boolean(
    searchParams.search?.trim() ||
      searchParams.type ||
      searchParams.direction ||
      searchParams.status
  );
  const isEmptyResult =
    !(isLoading && !docsResponse) &&
    docsResponse !== undefined &&
    docsResponse.total === 0;
  const collectionEmpty = (() => {
    if (!isEmptyResult) {
      return undefined;
    }
    if (hasActiveFilters) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="font-medium text-sm">
            No documents match these filters
          </p>
          <button
            className="text-primary text-sm underline-offset-4 hover:underline"
            onClick={clearFilters}
            type="button"
          >
            Clear filters
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="font-medium text-sm">No documents yet</p>
        <p className="text-muted-foreground text-sm">
          Create a quote, invoice, or bill to get started.
        </p>
      </div>
    );
  })();
  const handleCreate = async () => {
    if (!createType) {
      return;
    }
    const direction = createType === "bill" ? "purchase" : "sales";
    const payload =
      entityValue?.kind === "entity"
        ? {
            type: createType,
            direction: direction as "sales" | "purchase",
            entityId: entityValue.entity.id,
          }
        : {
            type: createType,
            direction: direction as "sales" | "purchase",
            entityName:
              entityValue?.kind === "walk_in" ? entityValue.name : "Walk-in",
          };
    const doc = await createDocument.mutateAsync(payload);
    setCreateType(null);
    navigate({
      to: "/documents/$id",
      params: {
        id: doc.id,
      },
    });
  };
  const columns: ColumnDef<DocumentRow>[] = [
    {
      id: "folio",
      meta: {
        label: "Folio",
      },
      accessorFn: (row) => documentFolioLabel(row),
      enableSorting: false,
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => (
        <Link
          className="font-medium hover:text-primary hover:underline"
          params={{
            id: row.original.id,
          }}
          to="/documents/$id"
        >
          {documentFolioLabel(row.original)}
        </Link>
      ),
    },
    {
      id: "type",
      meta: {
        label: "Type",
      },
      accessorKey: "type",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => <DocumentTypeBadge type={row.original.type} />,
    },
    {
      id: "entityName",
      meta: {
        label: "Entity",
      },
      accessorKey: "entityName",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => row.original.entityName ?? "Walk-in",
    },
    {
      id: "status",
      meta: {
        label: "Status",
      },
      accessorKey: "status",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => (
        <Badge className="capitalize" variant="secondary">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "paymentStatus",
      meta: {
        label: "Payment",
      },
      accessorKey: "paymentStatus",
      enableSorting: false,
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => {
        if (row.original.type === "quote") {
          return <span className="text-muted-foreground">—</span>;
        }
        return <PaymentStatusBadge status={row.original.paymentStatus} />;
      },
    },
    {
      id: "total",
      meta: {
        label: "Total",
      },
      accessorKey: "total",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {formatMoneyMinor(row.original.total, row.original.currencyCode)}
        </div>
      ),
    },
    {
      id: "createdAt",
      meta: {
        label: "Date",
      },
      accessorKey: "createdAt",
      header: ({ column }) => <SortableHeader column={column} />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.original.createdAt), "MMM d, yyyy")}
        </span>
      ),
    },
  ];
  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          items={[
            {
              title: "Documents",
            },
          ]}
        />
        <ShellHeaderActions>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" />}>
              <Plus className="mr-2 h-4 w-4" />
              New document
              <ChevronDown className="ml-1 h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {NEW_DOCUMENT_TYPES.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onSelect={() => {
                    setEntityValue({
                      kind: "walk_in",
                      name: "Walk-in",
                    });
                    setCreateType(type);
                  }}
                >
                  {documentTypeLabel(type)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </ShellHeaderActions>
      </ShellHeader>

      <ShellContent>
        {isLoading && !docsResponse ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            Loading documents...
          </div>
        ) : (
          <ResourceTable
            className="min-h-0 flex-1"
            collectionEmpty={collectionEmpty}
            columnFilters={columnFilters}
            columns={columns}
            data={docsResponse?.data ?? []}
            embedded
            filterDefinitions={DOCUMENT_FILTER_DEFINITIONS}
            filteredCount={docsResponse?.total ?? 0}
            onColumnFiltersChange={onColumnFiltersChange}
            onPaginationChange={onPaginationChange}
            onSortingChange={onSortingChange}
            pageCount={pageCount}
            pagination={pagination}
            sorting={sorting}
          />
        )}
      </ShellContent>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setCreateType(null);
          }
        }}
        open={createType !== null}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              New {createType ? documentTypeLabel(createType) : "document"}
            </DialogTitle>
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
              disabled={createDocument.isPending || !createType}
              onClick={handleCreate}
            >
              {createDocument.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ShellPage>
  );
}
