import { prisma } from "@/lib/db";

/** INV-40. Read-only — no mutation, so no withActor/audit wrapping applies. */

export type Period = "7d" | "30d" | "all";

export type DashboardMetrics = {
  companiesScanned: number;
  outreachSent: number;
  meetingsBooked: number;
  dealsWon: { count: number; mrr: number };
};

function periodStart(period: Period): Date | undefined {
  if (period === "all") return undefined;
  const days = period === "7d" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * "Companies scanned" is outbound-scanned companies only (Company.source =
 * outbound_scan) — an inbound signup wasn't scanned, it signed itself up.
 * Each tile keys off the timestamp that actually means "happened in this
 * period" for that thing: Company.createdAt, Activity.occurredAt,
 * Deal.closedAt — not a single shared date column.
 */
export async function getDashboardMetrics(
  period: Period,
): Promise<DashboardMetrics> {
  const since = periodStart(period);

  const [companiesScanned, outreachSent, meetingsBooked, wonDeals] =
    await Promise.all([
      prisma.company.count({
        where: {
          source: "outbound_scan",
          ...(since ? { createdAt: { gte: since } } : {}),
        },
      }),
      prisma.activity.count({
        where: {
          type: "email",
          ...(since ? { occurredAt: { gte: since } } : {}),
        },
      }),
      prisma.activity.count({
        where: {
          type: "meeting",
          ...(since ? { occurredAt: { gte: since } } : {}),
        },
      }),
      prisma.deal.findMany({
        where: {
          outcome: "won",
          ...(since ? { closedAt: { gte: since } } : {}),
        },
        select: { proposedMrr: true },
      }),
    ]);

  const dealsWonMrr = wonDeals.reduce(
    (sum, d) => sum + (d.proposedMrr ? Number(d.proposedMrr) : 0),
    0,
  );

  return {
    companiesScanned,
    outreachSent,
    meetingsBooked,
    dealsWon: { count: wonDeals.length, mrr: dealsWonMrr },
  };
}
