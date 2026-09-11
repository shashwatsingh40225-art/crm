"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";
import type { LifecycleStage } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox } from "@/components/ui/checkbox";
import { LifecycleBadge } from "@/components/ui/badges";
import { BulkOwnerBar } from "./bulk-owner-bar";

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

/**
 * Company list table (INV-52, row selection added INV-54). `data` arrives
 * already filtered, searched and paginated by the server component in
 * page.tsx - archived rows are never in it, so there's nothing extra to
 * exclude from selection here.
 *
 * Row selection is NOT built on `<DataTable>`'s (components/ui/data-table.tsx)
 * TanStack instance - that component is Foundation's, frozen, and doesn't
 * expose row-selection state to its caller. Instead the checkbox column below
 * is a normal `ColumnDef` closing over selection state owned right here, so
 * `<DataTable>` itself needed no changes. Selection is bounded to the current
 * page by construction: it resets whenever `data` changes (a new page or a
 * new filter), and there's no "select across pages" affordance.
 */
export function CompaniesTable({
  data,
  owners,
  emptyState,
}: {
  data: CompanyRow[];
  owners: { id: string; name: string }[];
  emptyState: React.ReactNode;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelectedIds(new Set());
  }, [data]);

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allSelected = data.length > 0 && data.every((row) => selectedIds.has(row.id));

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(data.map((row) => row.id)));
  }

  const columns: ColumnDef<CompanyRow>[] = [
    {
      id: "select",
      header: () => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all" />
        </div>
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => toggleOne(row.original.id)}
            aria-label={`Select ${row.original.name}`}
          />
        </div>
      ),
      enableSorting: false,
    },
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

  return (
    <div className="grid gap-3">
      {selectedIds.size > 0 ? (
        <BulkOwnerBar
          selectedIds={Array.from(selectedIds)}
          owners={owners}
          onDone={() => setSelectedIds(new Set())}
          onClear={() => setSelectedIds(new Set())}
        />
      ) : null}
      <DataTable
        columns={columns}
        data={data}
        onRowClick={(row) => router.push(`/companies/${row.id}`)}
        emptyState={emptyState}
      />
    </div>
  );
}
