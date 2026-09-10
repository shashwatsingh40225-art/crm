"use client";

import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { Source, StageKey } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { StageBadge } from "@/components/ui/badges";
import { cn } from "@/lib/utils";
import { currencyFormatter, dateFormatter } from "./deals-format";

/**
 * Serialized deal-list row (INV-25). Dates come across the server/client
 * boundary as ISO strings; Decimal MRR as a plain number - Prisma's own
 * types (Date, Decimal) are not serializable props.
 */
export type DealRow = {
  id: string;
  name: string;
  companyName: string;
  ownerName: string | null;
  stageKey: StageKey;
  stageName: string;
  source: Source;
  proposedMrr: number | null;
  /** Days since the deal's latest StageEvent, not since createdAt. */
  ageInStageDays: number;
  nextActionDue: string | null;
  isOverdue: boolean;
};

const columns: ColumnDef<DealRow>[] = [
  {
    accessorKey: "name",
    header: "Deal",
    cell: ({ row }) => (
      <div className="grid gap-0.5">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-muted-foreground text-xs">
          {row.original.companyName}
        </span>
      </div>
    ),
  },
  {
    accessorKey: "stageKey",
    header: "Stage",
    cell: ({ row }) => (
      <StageBadge stage={row.original.stageKey} label={row.original.stageName} />
    ),
  },
  {
    accessorKey: "ownerName",
    header: "Owner",
    cell: ({ row }) =>
      row.original.ownerName ?? (
        <span className="text-muted-foreground">Unassigned</span>
      ),
  },
  {
    accessorKey: "proposedMrr",
    header: "Proposed MRR",
    cell: ({ row }) =>
      row.original.proposedMrr !== null ? (
        currencyFormatter.format(row.original.proposedMrr)
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "ageInStageDays",
    header: "Age in stage",
    cell: ({ row }) => `${row.original.ageInStageDays}d`,
  },
  {
    accessorKey: "nextActionDue",
    header: "Next action due",
    cell: ({ row }) => {
      if (!row.original.nextActionDue) {
        return <span className="text-muted-foreground">—</span>;
      }
      const due = new Date(row.original.nextActionDue);
      return (
        <span
          className={cn(row.original.isOverdue && "text-destructive font-medium")}
        >
          {dateFormatter.format(due)}
          {row.original.isOverdue ? " · overdue" : ""}
        </span>
      );
    },
  },
];

export function DealsTable({
  deals,
  emptyState,
}: {
  deals: DealRow[];
  emptyState: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <DataTable
      columns={columns}
      data={deals}
      onRowClick={(row) => router.push(`/deals/${row.id}`)}
      emptyState={emptyState}
    />
  );
}
