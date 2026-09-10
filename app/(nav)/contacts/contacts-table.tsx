"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { LifecycleStage } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { LifecycleBadge } from "@/components/ui/badges";

export type ContactRow = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  lifecycleStage: LifecycleStage;
  owner: { id: string; name: string } | null;
  company: { id: string; name: string };
  lastActivityAt: Date | null;
};

const columns: ColumnDef<ContactRow>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "title", header: "Title", enableSorting: false },
  {
    id: "company",
    header: "Company",
    enableSorting: false,
    cell: ({ row }) => (
      <Link
        href={`/companies/${row.original.company.id}`}
        onClick={(e) => e.stopPropagation()}
        className="hover:underline"
      >
        {row.original.company.name}
      </Link>
    ),
  },
  { accessorKey: "email", header: "Email", enableSorting: false },
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
    accessorKey: "lastActivityAt",
    header: "Last activity",
    cell: ({ row }) =>
      row.original.lastActivityAt ? format(row.original.lastActivityAt, "MMM d, yyyy") : "—",
  },
];

/**
 * Contact list table (INV-52). Purely presentational, same split as
 * `app/(nav)/companies/companies-table.tsx` - `data` arrives already
 * filtered, searched and paginated by page.tsx.
 */
export function ContactsTable({
  data,
  emptyState,
}: {
  data: ContactRow[];
  emptyState: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={data}
      onRowClick={(row) => router.push(`/contacts/${row.id}`)}
      emptyState={emptyState}
    />
  );
}
