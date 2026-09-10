"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Users } from "lucide-react";
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

const ALL = "__all";

export function ContactsTable({ data }: { data: ContactRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState<string>(ALL);
  const [company, setCompany] = useState<string>(ALL);

  const companies = useMemo(() => {
    const seen = new Map<string, string>();
    for (const contact of data) seen.set(contact.company.id, contact.company.name);
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((contact) => {
      const matchesSearch =
        q === "" ||
        contact.name.toLowerCase().includes(q) ||
        (contact.email?.toLowerCase().includes(q) ?? false);
      const matchesLifecycle = lifecycle === ALL || contact.lifecycleStage === lifecycle;
      const matchesCompany = company === ALL || contact.company.id === company;
      return matchesSearch && matchesLifecycle && matchesCompany;
    });
  }, [data, search, lifecycle, company]);

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
        row.original.lastActivityAt
          ? format(row.original.lastActivityAt, "MMM d, yyyy")
          : "—",
    },
  ];

  const filtersActive = search !== "" || lifecycle !== ALL || company !== ALL;

  function clearFilters() {
    setSearch("");
    setLifecycle(ALL);
    setCompany(ALL);
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name or email..."
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
        <Select value={company} onValueChange={setCompany}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Company" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All companies</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtersActive ? (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        onRowClick={(row) => router.push(`/contacts/${row.id}`)}
        emptyState={
          <EmptyState
            icon={Users}
            title="No contacts match your filters"
            description="Try a different search term or clear the filters."
            action={
              filtersActive ? (
                <Button size="sm" variant="outline" onClick={clearFilters}>
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
