import type {
  PaginatedResponse,
  PaginationQuery,
} from "@workspace/types/pagination";

export function getPaginationOffsetLimit(
  params: Pick<PaginationQuery, "page" | "pageSize">
) {
  const offset = (params.page - 1) * params.pageSize;
  return { offset, limit: params.pageSize };
}

export function buildPaginatedResponse<T>(
  data: T[],
  total: number,
  params: Pick<PaginationQuery, "page" | "pageSize">
): PaginatedResponse<T> {
  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}
