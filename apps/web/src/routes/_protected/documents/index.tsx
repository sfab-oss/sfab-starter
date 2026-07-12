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
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { SortableHeader } from "@workspace/ui/components/brand/sortable-header";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import { Button } from "@workspace/ui/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/shadcn/dropdown-menu";
import { formatMoneyMinor } from "@workspace/ui/lib/money";
import {
  getColumnFilterValue,
  type TableFilterDefinition,
} from "@workspace/ui/lib/table-filter-types";
import { format } from "date-fns";
import { ChevronDown, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { CreateDocumentDialog } from "@/components/documents/create-document-dialog";
import {
  DocumentTypeBadge,
  documentFolioLabel,
  documentStatusLabel,
  documentTypeLabel,
} from "@/components/documents/document-type";
import { PaymentStatusBadge } from "@/components/documents/payment-status-badge";
import { ShellHeaderSidebarTrigger } from "@/components/layout/shell-header-sidebar-trigger";
import { useSetPageContext } from "@/components/providers/page-context";
import { type DocumentRow, useDocumentsList } from "@/hooks/use-documents";
import { dateFnsLocale, intlLocale } from "@/lib/locale";
import { pickListPageView } from "@/lib/page-context-view";
import {
  sortableHeaderAriaLabel,
  tableToolbarLabels,
} from "@/lib/table-toolbar-labels";
import { m } from "@/paraglide/messages.js";
export const Route = createFileRoute("/_protected/documents/")({
  component: DocumentsPage,
  validateSearch: listDocumentsQuerySchema,
});
function documentFilterDefinitions(): TableFilterDefinition[] {
  return [
    {
      id: "search",
      columnId: "search",
      label: m.documents_filter_search(),
      type: "text",
      placeholder: m.documents_filter_search_placeholder(),
    },
    {
      id: "type",
      columnId: "type",
      label: m.documents_filter_type(),
      type: "enum",
      options: [
        {
          label: m.documents_type_quote(),
          value: "quote",
        },
        {
          label: m.documents_type_invoice(),
          value: "invoice",
        },
        {
          label: m.documents_type_credit_note(),
          value: "credit_note",
        },
        {
          label: m.documents_type_bill(),
          value: "bill",
        },
      ],
    },
    {
      id: "direction",
      columnId: "direction",
      label: m.documents_filter_direction(),
      type: "enum",
      options: [
        {
          label: m.documents_direction_sales(),
          value: "sales",
        },
        {
          label: m.documents_direction_purchase(),
          value: "purchase",
        },
      ],
    },
    {
      id: "status",
      columnId: "status",
      label: m.documents_filter_status(),
      type: "enum",
      options: [
        {
          label: m.documents_status_draft(),
          value: "draft",
        },
        {
          label: m.documents_status_accepted(),
          value: "accepted",
        },
        {
          label: m.documents_status_converted(),
          value: "converted",
        },
        {
          label: m.documents_status_finalized(),
          value: "finalized",
        },
      ],
    },
  ];
}
function firstEnumValue(value: unknown): string | undefined {
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  if (typeof value === "string" && value) {
    return value;
  }
}
const NEW_DOCUMENT_TYPES = createableDocumentTypeSchema.options;
function DocumentsPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate({
    from: Route.fullPath,
  });
  const { data: docsResponse, isLoading } = useDocumentsList(searchParams);
  const [createType, setCreateType] = useState<
    (typeof NEW_DOCUMENT_TYPES)[number] | null
  >(null);
  useSetPageContext(
    useMemo(
      () => ({
        title: m.documents_title(),
        description: m.documents_page_description(),
        entityType: "documents",
        entityId: "list",
        view: pickListPageView(searchParams, ["type", "direction", "status"]),
      }),
      [searchParams]
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
      return;
    }
    if (hasActiveFilters) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="font-medium text-sm">{m.documents_empty_filtered()}</p>
          <button
            className="text-primary text-sm underline-offset-4 hover:underline"
            onClick={clearFilters}
            type="button"
          >
            {m.documents_clear_filters()}
          </button>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="font-medium text-sm">{m.documents_empty_title()}</p>
        <p className="text-muted-foreground text-sm">
          {m.documents_empty_hint()}
        </p>
      </div>
    );
  })();
  const columns: ColumnDef<DocumentRow>[] = [
    {
      id: "folio",
      meta: {
        label: m.documents_column_folio(),
      },
      accessorFn: (row) => documentFolioLabel(row),
      enableSorting: false,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          getAriaLabel={sortableHeaderAriaLabel}
        />
      ),
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
        label: m.documents_column_type(),
      },
      accessorKey: "type",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          getAriaLabel={sortableHeaderAriaLabel}
        />
      ),
      cell: ({ row }) => <DocumentTypeBadge type={row.original.type} />,
    },
    {
      id: "entityName",
      meta: {
        label: m.documents_column_entity(),
      },
      accessorKey: "entityName",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          getAriaLabel={sortableHeaderAriaLabel}
        />
      ),
      cell: ({ row }) => row.original.entityName ?? m.documents_walk_in(),
    },
    {
      id: "status",
      meta: {
        label: m.documents_column_status(),
      },
      accessorKey: "status",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          getAriaLabel={sortableHeaderAriaLabel}
        />
      ),
      cell: ({ row }) => (
        <Badge variant="secondary">
          {documentStatusLabel(row.original.status)}
        </Badge>
      ),
    },
    {
      id: "paymentStatus",
      meta: {
        label: m.documents_column_payment(),
      },
      accessorKey: "paymentStatus",
      enableSorting: false,
      header: ({ column }) => (
        <SortableHeader
          column={column}
          getAriaLabel={sortableHeaderAriaLabel}
        />
      ),
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
        label: m.documents_column_total(),
      },
      accessorKey: "total",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          getAriaLabel={sortableHeaderAriaLabel}
        />
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">
          {formatMoneyMinor(row.original.total, row.original.currencyCode, {
            locale: intlLocale(),
          })}
        </div>
      ),
    },
    {
      id: "createdAt",
      meta: {
        label: m.documents_column_date(),
      },
      accessorKey: "createdAt",
      header: ({ column }) => (
        <SortableHeader
          column={column}
          getAriaLabel={sortableHeaderAriaLabel}
        />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {format(new Date(row.original.createdAt), "MMM d, yyyy", {
            locale: dateFnsLocale(),
          })}
        </span>
      ),
    },
  ];
  return (
    <ShellPage>
      <ShellHeader>
        <ShellHeaderSidebarTrigger className="-ml-1" />
        <AppBreadcrumbs
          ellipsisAriaLabel={m.breadcrumb_ellipsis_aria()}
          homeLabel={m.nav_home()}
          items={[
            {
              title: m.documents_title(),
            },
          ]}
        />
        <ShellHeaderActions>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" />}>
              <Plus className="mr-2 h-4 w-4" />
              {m.documents_create()}
              <ChevronDown className="ml-1 h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {NEW_DOCUMENT_TYPES.map((type) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() => {
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
            {m.documents_loading_list()}
          </div>
        ) : (
          <ResourceTable
            className="min-h-0 flex-1"
            collectionEmpty={collectionEmpty}
            columnFilters={columnFilters}
            columns={columns}
            data={docsResponse?.data ?? []}
            embedded
            filterDefinitions={documentFilterDefinitions()}
            filteredCount={docsResponse?.total ?? 0}
            onColumnFiltersChange={onColumnFiltersChange}
            onPaginationChange={onPaginationChange}
            onSortingChange={onSortingChange}
            pageCount={pageCount}
            pagination={pagination}
            sorting={sorting}
            toolbarLabels={tableToolbarLabels()}
          />
        )}
      </ShellContent>

      <CreateDocumentDialog
        onOpenChange={(open) => {
          if (!open) {
            setCreateType(null);
          }
        }}
        open={createType !== null}
        type={createType}
      />
    </ShellPage>
  );
}
