import type { PageView } from "@workspace/contract/ai";

function isPageViewValue(value: unknown): value is PageView[string] {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/** Pick defined list-view search params for the agent page-context fingerprint. */
export function pickListPageView(
  source: Record<string, unknown>,
  filterKeys: readonly string[] = []
): PageView | undefined {
  const view: PageView = {};

  for (const key of ["page", "pageSize"] as const) {
    const value = source[key];
    if (isPageViewValue(value)) {
      view[key] = value;
    }
  }

  const search = source.search;
  if (typeof search === "string" && search.trim()) {
    view.search = search;
  }

  const sortBy = source.sortBy;
  if (typeof sortBy === "string" && sortBy) {
    view.sortBy = sortBy;
    const sortOrder = source.sortOrder;
    if (sortOrder === "asc" || sortOrder === "desc") {
      view.sortOrder = sortOrder;
    }
  }

  for (const key of filterKeys) {
    const value = source[key];
    if (key === "includeArchived") {
      if (value === true) {
        view.includeArchived = true;
      }
      continue;
    }
    if (isPageViewValue(value) && value !== "") {
      view[key] = value;
    }
  }

  return Object.keys(view).length > 0 ? view : undefined;
}
