"use client";

import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table";
import { AppBreadcrumbs } from "@workspace/ui/components/brand/app-breadcrumbs";
import { ResourceTable } from "@workspace/ui/components/brand/resource-table";
import {
  Shell,
  ShellContent,
  ShellHeader,
  ShellHeaderActions,
  ShellHeaderSidebarTrigger,
  ShellInset,
  ShellPage,
} from "@workspace/ui/components/brand/shell";
import { Button } from "@workspace/ui/components/shadcn/button";
import { useCallback, useMemo, useState } from "react";
import { AppShellSidebar } from "../../_shared/app-shell-sidebar";
import {
  COLLECT_DEFAULT_PAGE_SIZE,
  DEFAULT_GALLERY_INVOICE,
  filterInvoices,
  sortInvoices,
} from "../../_shared/collect/invoice-table";
import { MOCK_OPEN_INVOICES } from "../../_shared/collect/mock-open-invoices";
import {
  OPEN_INVOICE_COLUMNS,
  OPEN_INVOICE_FILTER_DEFINITIONS,
} from "../../_shared/collect/open-invoices-columns";
import type { OpenInvoiceRow } from "../../_shared/collect/payment-types";
import { RegistryQueryProvider } from "../../_shared/registry-query-provider";
import { PaymentFormDialog } from "./components/payment-form-dialog";
import type { PaymentFormValues } from "./lib/payment-form-schema";

export default function RecordPaymentDialogPage() {
  const [dialogOpen, setDialogOpen] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<OpenInvoiceRow>(
    DEFAULT_GALLERY_INVOICE
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: COLLECT_DEFAULT_PAGE_SIZE,
  });
  const [sorting, setSorting] = useState<SortingState>([
    { id: "balanceMinor", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const filteredRows = useMemo(
    () =>
      sortInvoices(filterInvoices(MOCK_OPEN_INVOICES, columnFilters), sorting),
    [columnFilters, sorting]
  );

  const pageCount = Math.max(
    1,
    Math.ceil(filteredRows.length / pagination.pageSize)
  );

  const pageRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return filteredRows.slice(start, start + pagination.pageSize);
  }, [filteredRows, pagination.pageIndex, pagination.pageSize]);

  const openPayment = useCallback((invoice: OpenInvoiceRow) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  }, []);

  const onPaginationChange = useCallback(
    (updater: Updater<PaginationState>) => {
      setPagination((current) =>
        typeof updater === "function" ? updater(current) : updater
      );
    },
    []
  );

  const onSortingChange = useCallback((updater: Updater<SortingState>) => {
    setSorting((current) =>
      typeof updater === "function" ? updater(current) : updater
    );
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }, []);

  const onColumnFiltersChange = useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      setColumnFilters((current) =>
        typeof updater === "function" ? updater(current) : updater
      );
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    },
    []
  );

  const handlePaymentSubmit = useCallback(async (_data: PaymentFormValues) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, []);

  return (
    <RegistryQueryProvider>
      <Shell sidebar={<AppShellSidebar activeId="collect" />}>
        <ShellInset>
          <ShellPage>
            <ShellHeader>
              <ShellHeaderSidebarTrigger className="-ml-1" />
              <AppBreadcrumbs items={[{ title: "Collect" }]} />
              <ShellHeaderActions>
                <Button
                  onClick={() => openPayment(DEFAULT_GALLERY_INVOICE)}
                  size="sm"
                  type="button"
                >
                  Record payment
                </Button>
              </ShellHeaderActions>
            </ShellHeader>
            <ShellContent>
              <ResourceTable
                className="min-h-0 flex-1"
                columnFilters={columnFilters}
                columns={OPEN_INVOICE_COLUMNS}
                data={pageRows}
                embedded
                filterDefinitions={OPEN_INVOICE_FILTER_DEFINITIONS}
                filteredCount={filteredRows.length}
                onColumnFiltersChange={onColumnFiltersChange}
                onPaginationChange={onPaginationChange}
                onRowClick={(row) => {
                  if (row.balanceMinor > 0) {
                    openPayment(row);
                  }
                }}
                onSortingChange={onSortingChange}
                pageCount={pageCount}
                pagination={pagination}
                rowMenuActions={(row) => [
                  {
                    label: "Record payment",
                    disabled: row.balanceMinor <= 0,
                    disabledReason: "Invoice is fully paid",
                    onSelect: () => openPayment(row),
                  },
                ]}
                rowPrimaryAction={(row) =>
                  row.balanceMinor > 0
                    ? {
                        label: "Collect",
                        onSelect: () => openPayment(row),
                      }
                    : null
                }
                sorting={sorting}
                totalCount={MOCK_OPEN_INVOICES.length}
              />
            </ShellContent>
          </ShellPage>
        </ShellInset>

        <PaymentFormDialog
          invoiceRow={selectedInvoice}
          onOpenChange={setDialogOpen}
          onSubmit={handlePaymentSubmit}
          open={dialogOpen}
        />
      </Shell>
    </RegistryQueryProvider>
  );
}
