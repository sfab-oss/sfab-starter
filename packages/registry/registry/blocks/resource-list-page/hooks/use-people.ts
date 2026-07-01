"use client";

import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import type { PaginatedResponse } from "@workspace/contract/pagination";
import { fetchPeopleList } from "../lib/people/fetch-people";
import type { PeopleListParams, PersonRow } from "../lib/people/types";
// --- GALLERY PREVIEW ONLY — delete this import for production ----------------
import { type ListPreviewMode, useListPreviewMode } from "./use-list-preview";
// ----------------------------------------------------------------------------

export const getPeopleKey = () => ["people"];
export const getPeopleListKey = (params: PeopleListParams) => [
  "people",
  "list",
  params,
];

export function peopleListQueryOptions(params: PeopleListParams) {
  return queryOptions({
    queryKey: getPeopleListKey(params),
    queryFn: () => fetchPeopleList(params),
    placeholderData: keepPreviousData,
  });
}

export function usePeopleList(params: PeopleListParams) {
  // --- GALLERY PREVIEW ONLY --------------------------------------------------
  // The gallery flips this list through its collection states. Everything below
  // returns the exact same React Query shape production returns, so the page and
  // components never learn that preview exists. To ship, delete this block and
  // the import above, then use the production return on the last line.
  const previewMode = useListPreviewMode();
  const isForcedState = previewMode === "loading" || previewMode === "error";
  return useQuery({
    ...peopleListQueryOptions(params),
    queryKey: [...getPeopleListKey(params), previewMode],
    queryFn: () => fetchPeopleForMode(params, previewMode),
    // Loading/error need the fresh state, not the kept-previous rows: loading
    // shows the initial skeleton (data undefined), error surfaces immediately
    // instead of retrying 3× over the stale rows first.
    placeholderData: isForcedState ? undefined : keepPreviousData,
    retry: previewMode === "error" ? false : undefined,
  });
  // ---------------------------------------------------------------------------

  // PRODUCTION: return useQuery(peopleListQueryOptions(params));
}

// --- GALLERY PREVIEW ONLY — delete for production ----------------------------
const PREVIEW_ERROR_MESSAGE =
  "Could not load people. Check your connection and try again.";

function fetchPeopleForMode(
  params: PeopleListParams,
  mode: ListPreviewMode
): Promise<PaginatedResponse<PersonRow>> {
  if (mode === "error") {
    return Promise.reject(new Error(PREVIEW_ERROR_MESSAGE));
  }

  if (mode === "empty") {
    return Promise.resolve({
      data: [],
      total: 0,
      page: params.page,
      pageSize: params.pageSize,
    });
  }

  if (mode === "loading") {
    // Never resolves — holds the skeleton until the mode changes (new queryKey).
    return new Promise<PaginatedResponse<PersonRow>>(() => undefined);
  }

  return fetchPeopleList(params);
}
// ----------------------------------------------------------------------------
