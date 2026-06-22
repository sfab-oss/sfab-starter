import type { ColumnFiltersState } from "@tanstack/react-table";
import type { PaginationQuery } from "@workspace/contract/pagination";

export type PersonStatus = "active" | "inactive";
export type PersonRole = "Customer" | "Supplier";

export interface PersonRow {
  id: string;
  name: string;
  role: PersonRole;
  city: string;
  status: PersonStatus;
}

export interface PeopleListParams extends PaginationQuery {
  columnFilters: ColumnFiltersState;
}
