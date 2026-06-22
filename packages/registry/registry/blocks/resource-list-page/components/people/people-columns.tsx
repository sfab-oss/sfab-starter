"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { SortableHeader } from "@workspace/ui/components/brand/sortable-header";
import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
  arrIncludesExact,
  enumOptionsFromValues,
  type TableFilterDefinition,
} from "@workspace/ui/lib/table-filter-types";
import type { PersonRow } from "../../lib/people/types";

export const PEOPLE_FILTER_DEFINITIONS: TableFilterDefinition[] = [
  {
    id: "name",
    columnId: "name",
    label: "Name",
    type: "text",
    placeholder: "Search names…",
  },
  {
    id: "role",
    columnId: "role",
    label: "Type",
    type: "enum",
    options: enumOptionsFromValues(["Customer", "Supplier"]),
  },
  {
    id: "city",
    columnId: "city",
    label: "City",
    type: "text",
    placeholder: "Search cities…",
  },
  {
    id: "status",
    columnId: "status",
    label: "Status",
    type: "enum",
    options: enumOptionsFromValues(["active", "inactive"]),
  },
];

export const PEOPLE_COLUMNS: ColumnDef<PersonRow>[] = [
  {
    id: "name",
    meta: { label: "Name" },
    accessorKey: "name",
    filterFn: "includesString",
    header: ({ column }) => <SortableHeader column={column} />,
  },
  {
    id: "role",
    meta: { label: "Type" },
    accessorKey: "role",
    filterFn: arrIncludesExact,
    header: ({ column }) => <SortableHeader column={column} />,
  },
  {
    id: "city",
    meta: { label: "City" },
    accessorKey: "city",
    filterFn: "includesString",
    header: ({ column }) => <SortableHeader column={column} />,
  },
  {
    id: "status",
    meta: { label: "Status" },
    accessorKey: "status",
    filterFn: arrIncludesExact,
    header: ({ column }) => <SortableHeader column={column} />,
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "active" ? "secondary" : "outline"}
      >
        {row.original.status}
      </Badge>
    ),
  },
];
