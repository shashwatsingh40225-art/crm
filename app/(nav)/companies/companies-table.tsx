"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { LifecycleStage } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { LifecycleBadge } from "@/components/ui/badges";

export type CompanyRow = {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  lifecycleStage: LifecycleStage;
  owner: { id: string; name: string } | null;
  openDeals: number;
  lastActivityAt: Date | null;
};

const columns: ColumnDef<CompanyRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "domain", header: "Domain", enableSorting: false },
  { accessorKey: "industry", header: "Industry", enableSorting: false },
  {
    accessorKey: "lifecycleStage",
    header: "Lifecycle",
    enableSorting: false,
    cell: ({ row }) => <LifecycleBadge stage={row.original.lifecycleStage} />,
  },
  {
    id: "owner",
    header: "Owner",
    enableSorting: false,
    cell: ({ row }) => row.original.owner?.name ?? "Unassigned",
  },
  {
    accessorKey: "openDeals",
    header: "Open deals",
    enableSorting: false,
  },
  {
    accessorKey: "lastActivityAt",
    header: "Last activity",
    cell: ({ row }) =>
      row.original.lastActivityAt ? format(row.original.lastActivityAt, "MMM d, yyyy") : "—",
  },
];

/**
 * Company list table (INV-52). Purely presentational: `data` arrives already
 * filtered, searched and paginated by the server component in page.tsx.
 * Filtering used to live here as client-side `useState`/`useMemo` over every
 * row - that's gone, replaced by `<CompaniesFilters>` writing to the URL and
 * the page re-querying Prisma on navigation.
 */
export function CompaniesTable({
  data,
  emptyState,
}: {
  data: CompanyRow[];
  emptyState: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={(row) => router.push(`/companies/${row.id}`)}
      emptyState={emptyState}
    />
  );
}
