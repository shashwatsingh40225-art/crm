import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ageInDays, STALE_DAYS } from "@/app/(nav)/deals/deals-format";

/**
 * INV-41 (and the "stale deals" section of INV-37's work queue, which reuses
 * this with an owner filter). Read-only — no mutation, so no withActor/audit
 * wrapping applies.
 */

export type StaleDeal = {
  id: string;
  name: string;
  companyName: string;
  stageName: string;
  ownerName: string | null;
  daysStale: number;
  nextAction: string | null;
  nextActionDue: string | null;
};

/**
 * A deal counts as stale when NEITHER an Activity NOR a StageEvent has
 * touched it in the last `STALE_DAYS` — "no activity in 7 days" per the
 * ticket, where a stage move counts as activity too. That's the later of the
 * two latest timestamps (falling back to createdAt for a deal with neither),
 * run through the same `ageInDays`/`STALE_DAYS` Agent B already exported from
 * deals-format.ts for its own "age in stage" indicator — reused here rather
 * than redefining what "7 days" means a second time.
 *
 * This is deliberately a different measure than deals-table.tsx's "age in
 * stage" column, which only looks at StageEvent and answers a different
 * question (how long in the *current* stage, not how long untouched).
 */
export async function getStaleDeals(filters: {
  ownerId?: string;
} = {}): Promise<StaleDeal[]> {
  const where: Prisma.DealWhereInput = { outcome: null, archivedAt: null };
  if (filters.ownerId) where.ownerId = filters.ownerId;

  const deals = await prisma.deal.findMany({
    where,
    select: {
      id: true,
      name: true,
      nextAction: true,
      nextActionDue: true,
      createdAt: true,
      company: { select: { name: true } },
      stage: { select: { name: true } },
      owner: { select: { name: true } },
      stageEvents: {
        orderBy: { changedAt: "desc" },
        take: 1,
        select: { changedAt: true },
      },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { occurredAt: true },
      },
    },
  });

  return deals
    .map((d) => {
      const lastStageEvent = d.stageEvents[0]?.changedAt ?? null;
      const lastActivity = d.activities[0]?.occurredAt ?? null;
      const lastTouch = [lastStageEvent, lastActivity, d.createdAt]
        .filter((date): date is Date => date !== null)
        .reduce((latest, date) => (date > latest ? date : latest));

      return {
        id: d.id,
        name: d.name,
        companyName: d.company.name,
        stageName: d.stage.name,
        ownerName: d.owner?.name ?? null,
        daysStale: ageInDays(lastTouch),
        nextAction: d.nextAction,
        nextActionDue: d.nextActionDue ? d.nextActionDue.toISOString() : null,
      };
    })
    .filter((d) => d.daysStale > STALE_DAYS)
    .sort((a, b) => b.daysStale - a.daysStale);
}
