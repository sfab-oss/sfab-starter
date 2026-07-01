import type { ColumnFiltersState } from "@tanstack/react-table";
import type { PaginatedResponse } from "@workspace/contract/pagination";
import { MOCK_PEOPLE } from "./mock-people";
import type { PeopleListParams, PersonRow } from "./types";

const LIST_FETCH_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function matchesTextColumn(
  row: PersonRow,
  columnId: "name" | "city",
  value: unknown
): boolean {
  if (typeof value !== "string" || value.trim().length === 0) {
    return true;
  }

  const cellValue = String(row[columnId]);
  return cellValue.toLowerCase().includes(value.trim().toLowerCase());
}

function matchesEnumColumn(
  row: PersonRow,
  columnId: "role" | "status",
  value: unknown
): boolean {
  if (!Array.isArray(value) || value.length === 0) {
    return true;
  }

  return value.includes(row[columnId]);
}

function rowMatchesFilter(
  row: PersonRow,
  filter: { id: string; value: unknown }
): boolean {
  if (filter.id === "name" || filter.id === "city") {
    return matchesTextColumn(row, filter.id, filter.value);
  }

  if (filter.id === "role" || filter.id === "status") {
    return matchesEnumColumn(row, filter.id, filter.value);
  }

  return true;
}

function applyColumnFilters(
  rows: PersonRow[],
  columnFilters: ColumnFiltersState
): PersonRow[] {
  return rows.filter((row) =>
    columnFilters.every((filter) => rowMatchesFilter(row, filter))
  );
}

function applySort(
  rows: PersonRow[],
  sortBy: string | undefined,
  sortOrder: "asc" | "desc"
): PersonRow[] {
  if (!sortBy) {
    return rows;
  }

  const sorted = [...rows].sort((left, right) => {
    const leftValue = String(left[sortBy as keyof PersonRow]);
    const rightValue = String(right[sortBy as keyof PersonRow]);
    const comparison = leftValue.localeCompare(rightValue, undefined, {
      sensitivity: "base",
    });

    return sortOrder === "desc" ? -comparison : comparison;
  });

  return sorted;
}

export async function fetchPeopleList(
  params: PeopleListParams
): Promise<PaginatedResponse<PersonRow>> {
  await sleep(LIST_FETCH_DELAY_MS);

  const filtered = applySort(
    applyColumnFilters(MOCK_PEOPLE, params.columnFilters),
    params.sortBy,
    params.sortOrder
  );

  const start = (params.page - 1) * params.pageSize;
  const data = filtered.slice(start, start + params.pageSize);

  return {
    data,
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export function getPeopleUnfilteredTotal(): number {
  return MOCK_PEOPLE.length;
}
