import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import type { OpenInvoiceRow } from "./payment-types";

export const COLLECT_DEFAULT_PAGE_SIZE = 10;

export const DEFAULT_GALLERY_INVOICE: OpenInvoiceRow = {
  id: "inv-1042",
  folio: "INV-1042",
  client: "Northside Distributors",
  totalMinor: 1_250_000,
  paidMinor: 500_000,
  balanceMinor: 750_000,
  paymentStatus: "partial",
  dueDate: "2026-06-24",
  notes: "Net-30 terms · follow up before due date",
};

export function filterInvoices(
  rows: OpenInvoiceRow[],
  columnFilters: ColumnFiltersState
): OpenInvoiceRow[] {
  if (columnFilters.length === 0) {
    return rows;
  }

  return rows.filter((row) =>
    columnFilters.every((filter) => {
      const value = row[filter.id as keyof OpenInvoiceRow];
      if (filter.id === "paymentStatus") {
        const values = filter.value;
        if (!Array.isArray(values) || values.length === 0) {
          return true;
        }
        return values.includes(String(value));
      }
      if (typeof value === "string") {
        return value.toLowerCase().includes(String(filter.value).toLowerCase());
      }
      return true;
    })
  );
}

export function sortInvoices(
  rows: OpenInvoiceRow[],
  sorting: SortingState
): OpenInvoiceRow[] {
  const sort = sorting[0];
  if (!sort) {
    return [...rows].sort((a, b) => b.balanceMinor - a.balanceMinor);
  }

  const sorted = [...rows];
  sorted.sort((a, b) => {
    const aValue = a[sort.id as keyof OpenInvoiceRow];
    const bValue = b[sort.id as keyof OpenInvoiceRow];
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sort.desc ? bValue - aValue : aValue - bValue;
    }
    return sort.desc
      ? String(bValue).localeCompare(String(aValue))
      : String(aValue).localeCompare(String(bValue));
  });
  return sorted;
}
