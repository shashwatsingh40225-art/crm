"use client";

import { useQueryStates } from "nuqs";
import type { IcpFit, LifecycleStage, Source } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { companiesSearchParams, UNASSIGNED_OWNER } from "./search-params";

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  prospect: "Prospect",
  lead: "Lead",
  qualified: "Qualified",
  opportunity: "Opportunity",
  customer: "Customer",
  churned: "Churned",
  disqualified: "Disqualified",
};

const ICP_LABELS: Record<IcpFit, string> = {
  strong: "Strong fit",
  moderate: "Moderate fit",
  weak: "Weak fit",
  none: "Not a fit",
};

const SOURCE_LABELS: Record<Source, string> = {
  outbound_scan: "Outbound scan",
  inbound_signup: "Inbound signup",
  referral: "Referral",
};

const ALL = "__all";

/**
 * Server-side search/filter bar for the company list (INV-52). All state
 * lives in the URL via nuqs (search-params.ts) - this component only reads
 * and writes search params, it never filters `data` itself. Every change
 * also clears `page` back to 1, since a narrower filter can leave the
 * previous page out of range.
 */
export function CompaniesFilters({
  owners,
}: {
  owners: { id: string; name: string }[];
}) {
  const [{ q, stage, icpFit, owner, source }, setFilters] = useQueryStates(
    companiesSearchParams,
  );

  const hasFilters = Boolean(q || stage || icpFit || owner || source);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder="Search name or domain..."
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
        value={icpFit ?? ALL}
        onValueChange={(v) =>
          setFilters({ icpFit: v === ALL ? null : (v as IcpFit), page: null })
        }
      >
        <SelectTrigger className="w-40" aria-label="Filter by ICP fit">
          <SelectValue placeholder="ICP fit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All ICP fit</SelectItem>
          {Object.entries(ICP_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={owner ?? ALL}
        onValueChange={(v) => setFilters({ owner: v === ALL ? null : v, page: null })}
      >
        <SelectTrigger className="w-44" aria-label="Filter by owner">
          <SelectValue placeholder="Owner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All owners</SelectItem>
          <SelectItem value={UNASSIGNED_OWNER}>Unassigned</SelectItem>
          {owners.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={source ?? ALL}
        onValueChange={(v) =>
          setFilters({ source: v === ALL ? null : (v as Source), page: null })
        }
      >
        <SelectTrigger className="w-40" aria-label="Filter by source">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All sources</SelectItem>
          {Object.entries(SOURCE_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setFilters({ q: null, stage: null, icpFit: null, owner: null, source: null, page: null })
          }
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
