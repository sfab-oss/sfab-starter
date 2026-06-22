"use client";

import {
  keepPreviousData,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import { fetchPeopleList } from "../lib/people/fetch-people";
import type { PeopleListParams } from "../lib/people/types";

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
  return useQuery(peopleListQueryOptions(params));
}
