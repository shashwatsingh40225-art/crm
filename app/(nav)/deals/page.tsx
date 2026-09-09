import { Handshake } from "lucide-react";
import type { Prisma, Source } from "@prisma/client";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { DealsFilters } from "./deals-filters";
import { DealsTable, type DealRow } from "./deals-table";

export const runtime = "nodejs";

const SOURCE_VALUES: Source[] = ["outbound_scan", "inbound_signup", "referral"];
function isSource(value: string): value is Source {
  return (SOURCE_VALUES as string[]).includes(value);
}

/**
 * Deal list (INV-25). Server component: filters are read from the URL search
 * params and applied in the Prisma `where`, so the list, the filter state and
 * a shared link/refresh all agree - no separate client-side filter state.
 *
 * Age in stage is computed from each deal's latest StageEvent, not from
 * createdAt (acceptance criterion) - a deal that has moved stages several
 * times should show how long it's sat in its *current* stage.
 */
export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; owner?: string; source?: string }>;
}) {
  const params = await searchParams;

  const [stages, owners] = await Promise.all([
    prisma.stage.findMany({ orderBy: { position: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  const where: Prisma.DealWhereInput = {};
  if (params.stage) {
    const stage = stages.find((s) => s.key === params.stage);
    if (stage) where.stageId = stage.id;
  }
  if (params.owner) where.ownerId = params.owner;
  if (params.source && isSource(params.source)) where.source = params.source;

  const hasFilters = Boolean(params.stage || params.owner || params.source);

  const deals = await prisma.deal.findMany({
    where,
    include: {
      company: { select: { name: true } },
      owner: { select: { name: true } },
      stage: true,
      stageEvents: { orderBy: { changedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = Date.now();
  const rows: DealRow[] = deals.map((d) => {
    const enteredStageAt = d.stageEvents[0]?.changedAt ?? d.createdAt;
    const ageInStageDays = Math.max(
      0,
      Math.floor((now - enteredStageAt.getTime()) / 86_400_000),
    );
    const isOverdue =
      !d.outcome &&
      d.nextActionDue !== null &&
      d.nextActionDue.getTime() < now;

    return {
      id: d.id,
      name: d.name,
      companyName: d.company.name,
      ownerName: d.owner?.name ?? null,
      stageKey: d.stage.key,
      stageName: d.stage.name,
      source: d.source,
      proposedMrr: d.proposedMrr ? Number(d.proposedMrr) : null,
      ageInStageDays,
      nextActionDue: d.nextActionDue ? d.nextActionDue.toISOString() : null,
      isOverdue,
    };
  });

  return (
    <>
      <PageHeader
        title="Deals"
        description="One pipeline, seven gated stages, both motions."
      />
      <DealsFilters stages={stages} owners={owners} />
      <DealsTable
        deals={rows}
        emptyState={
          <EmptyState
            icon={Handshake}
            title={hasFilters ? "No deals match these filters" : "No deals yet"}
            description={
              hasFilters
                ? "Clear a filter to widen the search."
                : "Deals appear here once a prospect is scanned or a signup comes in."
            }
          />
        }
      />
    </>
  );
}
