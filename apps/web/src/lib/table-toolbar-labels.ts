import type {
  SortAriaLabelFn,
  SortDirection,
} from "@workspace/ui/components/brand/sortable-header";
import type { TableFilterToolbarLabels } from "@workspace/ui/components/brand/table-filter-toolbar";
import { m } from "@/paraglide/messages.js";

export function tableToolbarLabels(): TableFilterToolbarLabels {
  return {
    filters: m.table_filters(),
    filtersActive: (count) => m.table_filters_active({ count: String(count) }),
    clearAll: m.table_clear_all(),
    removeFilter: (label) => m.table_remove_filter({ label }),
    row: m.table_row(),
    rows: m.table_rows(),
    rowsOf: (filtered, total) =>
      m.table_rows_of({
        filtered: String(filtered),
        total: String(total),
      }),
    pageOf: (page, total) =>
      m.table_page_of({ page: String(page), total: String(total) }),
    sort: {
      sort: m.table_sort(),
      sortBy: m.table_sort_by(),
      clear: m.table_clear(),
      ascending: m.table_ascending(),
      descending: m.table_descending(),
      sortedByAria: (column, direction) =>
        m.table_sorted_by_aria({
          column,
          direction:
            direction === "asc" ? m.table_ascending() : m.table_descending(),
        }),
    },
  };
}

/** Locale-aware aria labels for `SortableHeader`. */
export const sortableHeaderAriaLabel: SortAriaLabelFn = (
  label: string,
  sorted: SortDirection
) => {
  if (sorted === "asc") {
    return m.table_sorted_by_asc_aria({ column: label });
  }
  if (sorted === "desc") {
    return m.table_sorted_by_desc_aria({ column: label });
  }
  return m.table_sort_by_aria({ column: label });
};
