"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import { fetchOrganizationSettings } from "../lib/fetch-organization-settings";

export const getOrganizationSettingsKey = () => ["organization-settings"];

export function organizationSettingsQueryOptions() {
  return queryOptions({
    queryKey: getOrganizationSettingsKey(),
    queryFn: () => fetchOrganizationSettings(),
  });
}

export function useOrganizationSettings() {
  return useQuery(organizationSettingsQueryOptions());
}
