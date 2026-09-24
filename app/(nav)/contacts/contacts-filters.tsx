"use client";

import { useQueryStates } from "nuqs";
import type { LifecycleStage } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { contactsSearchParams } from "./search-params";

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  prospect: "Prospect",
  lead: "Lead",
  qualified: "Qualified",
  opportunity: "Opportunity",
  customer: "Customer",
  churned: "Churned",
  disqualified: "Disqualified",
};

const ALL = "__all";

/**
 * Server-side search/filter bar for the contact list (INV-52). Same pattern
 * as `app/(nav)/companies/companies-filters.tsx`: state lives entirely in the
 * URL via nuqs, nothing here filters `data` client-side.
 */
export function ContactsFilters({
  companies,
}: {
  companies: { id: string; name: string }[];
}) {
  const [{ q, stage, company }, setFilters] = useQueryStates(contactsSearchParams);

  const hasFilters = Boolean(q || stage || company);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
      <Input
        placeholder="Search name or email..."
        value={q}
        onChange={(e) => setFilters({ q: e.target.value, page: null })}
        className="w-64"
      />

      <Select
        value={stage ?? ALL}
        onValueChange={(v) =>
          setFilters({ stage: v === ALL ? null : (v as LifecycleStage), page: null })
        }
      >
        <SelectTrigger className="w-44" aria-label="Filter by lifecycle stage">
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

      <Select
        value={company ?? ALL}
        onValueChange={(v) => setFilters({ company: v === ALL ? null : v, page: null })}
      >
        <SelectTrigger className="w-44" aria-label="Filter by company">
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

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({ q: null, stage: null, company: null, page: null })}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
