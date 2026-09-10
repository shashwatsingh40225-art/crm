import type { Prisma, Source } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * INV-38. Read-only — no mutation, so no withActor/audit wrapping applies.
 */

export type FunnelFilters = {
  source?: Source;
  from?: Date;
  to?: Date;
  /** INV-59 Mine/Team scope — filters both the snapshot and the StageEvent history to deals owned by this user. */
  ownerId?: string;
};

export type FunnelStageMetric = {
  key: string;
  name: string;
  position: number;
  dealCount: number;
  mrr: number;
  medianDaysInStage: number | null;
  /** Null for the terminal stage, or for a stage nobody has ever reached. */
  conversionRateToNext: number | null;
};

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function intersectionSize(a: Set<string>, b: Set<string>): number {
  let count = 0;
  for (const id of a) if (b.has(id)) count++;
  return count;
}

/**
 * Two independent views over the same seven stages:
 *
 *  - dealCount / mrr / medianDaysInStage are a SNAPSHOT: where deals sit
 *    right now, filtered by `source` and by Deal.createdAt within
 *    [from, to] when given.
 *
 *  - conversionRateToNext is HISTORICAL, built from StageEvent (INV-38 AC:
 *    "Conversion computed from StageEvent history, not from current stage
 *    counts"). A deal "reaches" a stage if it has ever had a StageEvent
 *    into it — a later backwards move doesn't un-reach it. [from, to] here
 *    filters StageEvent.changedAt, so a date range reads as "transitions
 *    that happened in this window," which is a different question from the
 *    snapshot filter above.
 *
 *    Conversion from stage N to N+1 is
 *    |reached(N) ∩ reached(N+1)| / |reached(N)| — an INTERSECTION, not
 *    independent set sizes. This matters because D3 gives inbound signups a
 *    second entry point at Engaged: reached(Engaged) includes deals that
 *    never passed through Contacted at all, so
 *    reached(Engaged) / reached(Contacted) can run over 100%. Intersecting
 *    first counts only deals that actually made THIS transition.
 */
export async function getFunnelMetrics(
  filters: FunnelFilters,
): Promise<FunnelStageMetric[]> {
  const stages = await prisma.stage.findMany({ orderBy: { position: "asc" } });

  const dealWhere: Prisma.DealWhereInput = {};
  if (filters.source) dealWhere.source = filters.source;
  if (filters.ownerId) dealWhere.ownerId = filters.ownerId;
  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from) createdAt.gte = filters.from;
    if (filters.to) createdAt.lte = filters.to;
    dealWhere.createdAt = createdAt;
  }

  const deals = await prisma.deal.findMany({
    where: dealWhere,
    select: {
      id: true,
      stageId: true,
      proposedMrr: true,
      createdAt: true,
      stageEvents: {
        orderBy: { changedAt: "desc" },
        take: 1,
        select: { changedAt: true },
      },
    },
  });

  const eventWhere: Prisma.StageEventWhereInput = {};
  if (filters.source || filters.ownerId) {
    eventWhere.deal = {
      ...(filters.source ? { source: filters.source } : {}),
      ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
    };
  }
  if (filters.from || filters.to) {
    const changedAt: Prisma.DateTimeFilter = {};
    if (filters.from) changedAt.gte = filters.from;
    if (filters.to) changedAt.lte = filters.to;
    eventWhere.changedAt = changedAt;
  }

  const events = await prisma.stageEvent.findMany({
    where: eventWhere,
    select: { dealId: true, toStageId: true },
  });

  const reachedByStage = new Map<string, Set<string>>();
  for (const event of events) {
    if (!reachedByStage.has(event.toStageId)) {
      reachedByStage.set(event.toStageId, new Set());
    }
    reachedByStage.get(event.toStageId)!.add(event.dealId);
  }

  const now = Date.now();

  return stages.map((stage, i) => {
    const dealsInStage = deals.filter((d) => d.stageId === stage.id);
    const mrr = dealsInStage.reduce(
      (sum, d) => sum + (d.proposedMrr ? Number(d.proposedMrr) : 0),
      0,
    );
    const daysInStage = dealsInStage.map((d) => {
      const enteredAt = d.stageEvents[0]?.changedAt ?? d.createdAt;
      return Math.max(0, Math.floor((now - enteredAt.getTime()) / 86_400_000));
    });

    const nextStage = stages[i + 1];
    const reachedThisSet = reachedByStage.get(stage.id) ?? new Set<string>();
    const reachedNextSet = nextStage
      ? (reachedByStage.get(nextStage.id) ?? new Set<string>())
      : new Set<string>();
    const reachedThis = reachedThisSet.size;
    const advanced = nextStage
      ? intersectionSize(reachedThisSet, reachedNextSet)
      : 0;
    const conversionRateToNext =
      nextStage && reachedThis > 0
        ? Math.round((advanced / reachedThis) * 1000) / 10
        : null;

    return {
      key: stage.key,
      name: stage.name,
      position: stage.position,
      dealCount: dealsInStage.length,
      mrr,
      medianDaysInStage: median(daysInStage),
      conversionRateToNext,
    };
  });
}
