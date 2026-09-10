"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Building2 } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { LifecycleStage } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LifecycleBadge } from "@/components/ui/badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  prospect: "Prospect",
  lead: "Lead",
  qualified: "Qualified",
  opportunity: "Opportunity",
  customer: "Customer",
  churned: "Churned",
  disqualified: "Disqualified",
};

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

const ALL = "__all";

export function CompaniesTable({
  data,
  owners,
}: {
  data: CompanyRow[];
  owners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState<string>(ALL);
  const [owner, setOwner] = useState<string>(ALL);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((company) => {
      const matchesSearch =
        q === "" ||
        company.name.toLowerCase().includes(q) ||
        (company.domain?.toLowerCase().includes(q) ?? false);
      const matchesLifecycle = lifecycle === ALL || company.lifecycleStage === lifecycle;
      const matchesOwner =
        owner === ALL ||
        (owner === "__unassigned" ? company.owner === null : company.owner?.id === owner);
      return matchesSearch && matchesLifecycle && matchesOwner;
    });
  }, [data, search, lifecycle, owner]);

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
        row.original.lastActivityAt
          ? format(row.original.lastActivityAt, "MMM d, yyyy")
          : "—",
    },
  ];

  const filtersActive = search !== "" || lifecycle !== ALL || owner !== ALL;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or domain..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <Select value={lifecycle} onValueChange={setLifecycle}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Lifecycle stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All lifecycle stages</SelectItem>
            {Object.entries(LIFECYCLE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={owner} onValueChange={setOwner}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All owners</SelectItem>
            <SelectItem value="__unassigned">Unassigned</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtersActive ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setLifecycle(ALL);
              setOwner(ALL);
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => router.push(`/companies/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Building2}
            title="No companies match your filters"
            description="Try a different search term or clear the filters."
            action={
              filtersActive ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setLifecycle(ALL);
                    setOwner(ALL);
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  );
}
