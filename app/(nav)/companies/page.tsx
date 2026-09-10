import Link from "next/link";
import { Building2, PlusIcon, UploadIcon } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { CompaniesFilters } from "./companies-filters";
import { CompaniesTable, type CompanyRow } from "./companies-table";
import { PaginationControls } from "./pagination-controls";
import { loadCompaniesSearchParams, PAGE_SIZE, UNASSIGNED_OWNER } from "./search-params";
import type { SearchParams } from "nuqs/server";

export const runtime = "nodejs";

/**
 * Company list (INV-52). Server component: search, filters and paging are
 * read from the URL (nuqs) and applied in the Prisma `where`/`skip`/`take` -
 * the browser filters nothing that this query didn't already narrow.
 *
 * Replaces two things that used to live in companies-table.tsx: client-side
 * search/filter over every row, and an unbounded list with no paging.
 *
 * Also replaces the per-row N+1 the old version carried on purpose (its own
 * comment said "revisit if a real dataset makes this list slow" - this is
 * that revisit): one `deal.groupBy` for open-deal counts and one
 * `activity.findMany` (reduced in JS below) for last-activity, instead of two
 * queries per company. `activity.groupBy` alone can't express "activity on
 * this company OR on one of its contacts OR on one of its deals" - that OR is
 * across relations, not a single column - so the last-activity fetch pulls
 * every matching activity for the page's companies in one query and reduces
 * to one row per company here, ordered by `occurredAt desc` so the first hit
 * per company is the latest.
 */
export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, stage, icpFit, owner, source, page } =
    await loadCompaniesSearchParams(searchParams);

  const where: Prisma.CompanyWhereInput = { archivedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { domain: { contains: q, mode: "insensitive" } },
    ];
  }
  if (stage) where.lifecycleStage = stage;
  if (icpFit) where.icpFit = icpFit;
  if (source) where.source = source;
  if (owner) where.ownerId = owner === UNASSIGNED_OWNER ? null : owner;

  const hasFilters = Boolean(q || stage || icpFit || source || owner);

  const [total, companies, owners] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const companyIds = companies.map((c) => c.id);

  const [dealCounts, activities] = await Promise.all([
    prisma.deal.groupBy({
      by: ["companyId"],
      where: { companyId: { in: companyIds }, outcome: null },
      _count: { _all: true },
    }),
    prisma.activity.findMany({
      where: {
        OR: [
          { companyId: { in: companyIds } },
          { contact: { companyId: { in: companyIds } } },
          { deal: { companyId: { in: companyIds } } },
        ],
      },
      orderBy: { occurredAt: "desc" },
      select: {
        occurredAt: true,
        companyId: true,
        contact: { select: { companyId: true } },
        deal: { select: { companyId: true } },
      },
    }),
  ]);

  const openDealsByCompany = new Map(dealCounts.map((d) => [d.companyId, d._count._all]));

  const lastActivityByCompany = new Map<string, Date>();
  for (const activity of activities) {
    const companyId = activity.companyId ?? activity.contact?.companyId ?? activity.deal?.companyId;
    if (companyId && !lastActivityByCompany.has(companyId)) {
      lastActivityByCompany.set(companyId, activity.occurredAt);
    }
  }

  const rows: CompanyRow[] = companies.map((company) => ({
    id: company.id,
    name: company.name,
    domain: company.domain,
    industry: company.industry,
    lifecycleStage: company.lifecycleStage,
    owner: company.owner,
    openDeals: openDealsByCompany.get(company.id) ?? 0,
    lastActivityAt: lastActivityByCompany.get(company.id) ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Companies"
        description="Outbound-scanned prospects and inbound signups' employers."
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href="/companies/import">
                <UploadIcon />
                Import CSV
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/companies/new">
                <PlusIcon />
                New company
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4">
        <CompaniesFilters owners={owners} />
        <CompaniesTable
          data={rows}
          emptyState={
            <EmptyState
              icon={Building2}
              title={hasFilters ? "No companies match these filters" : "No companies yet"}
              description={
                hasFilters
                  ? "Try a different search term or clear the filters."
                  : "Companies appear here once a prospect is scanned or a signup comes in."
              }
            />
          }
        />
        <PaginationControls total={total} page={page} />
      </div>
    </>
  );
}
