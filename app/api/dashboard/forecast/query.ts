import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * INV-58. Read-only — no mutation, so no withActor/audit wrapping applies.
 */

export type ForecastStageRow = {
  key: string;
  name: string;
  position: number;
  dealCount: number;
  /** Counted in `dealCount`, contribute $0 to `rawMrr`/`weightedMrr`. */
  dealsWithoutMrr: number;
  rawMrr: number;
  weightedMrr: number;
};

export type WeightedForecast = {
  stages: ForecastStageRow[];
  totalDealCount: number;
  totalDealsWithoutMrr: number;
  totalRawMrr: number;
  totalWeightedMrr: number;
};

type StageAccumulator = {
  key: string;
  name: string;
  position: number;
  probability: number;
  dealCount: number;
  dealsWithoutMrr: number;
  rawMrr: Prisma.Decimal;
  weightedMrr: Prisma.Decimal;
};

/**
 * `weighted = proposedMrr * (stage.probability / 100)`, summed over every
 * open (outcome: null), non-archived deal with a `proposedMrr`. Decimal
 * arithmetic throughout — proposedMrr is a Decimal(10,2), and multiplying
 * through Number would introduce float rounding into a revenue figure.
 * Everything is converted to Number only once, at the very end, for
 * display — and the totals are summed from the same per-stage Decimals used
 * to build each row, so the total is exactly the sum of the displayed rows.
 *
 * No stage is hardcoded as excluded: a deal only reaches the terminal
 * "Won / Lost" stage by way of the transition that also sets `outcome`
 * (CLAUDE.md's stage-gate table), so `outcome: null` already guarantees no
 * open deal is ever sitting in that stage — the table below only ever shows
 * stages an open deal can actually be in.
 *
 * `ownerId` is the INV-59 Mine/Team scope, same as every other dashboard
 * query.
 */
export async function getWeightedForecast(
  ownerId?: string,
): Promise<WeightedForecast> {
  const deals = await prisma.deal.findMany({
    where: {
      outcome: null,
      archivedAt: null,
      ...(ownerId ? { ownerId } : {}),
    },
    select: {
      proposedMrr: true,
      stage: {
        select: {
          id: true,
          key: true,
          name: true,
          position: true,
          probability: true,
        },
      },
    },
  });

  const byStage = new Map<string, StageAccumulator>();

  for (const deal of deals) {
    const s = deal.stage;
    let row = byStage.get(s.id);
    if (!row) {
      row = {
        key: s.key,
        name: s.name,
        position: s.position,
        probability: s.probability,
        dealCount: 0,
        dealsWithoutMrr: 0,
        rawMrr: new Prisma.Decimal(0),
        weightedMrr: new Prisma.Decimal(0),
      };
      byStage.set(s.id, row);
    }

    row.dealCount++;
    if (deal.proposedMrr === null) {
      row.dealsWithoutMrr++;
      continue;
    }
    row.rawMrr = row.rawMrr.add(deal.proposedMrr);
    row.weightedMrr = row.weightedMrr.add(
      deal.proposedMrr.mul(row.probability).div(100),
    );
  }

  const accumulators = [...byStage.values()].sort(
    (a, b) => a.position - b.position,
  );

  const totalRawMrr = accumulators.reduce(
    (sum, s) => sum.add(s.rawMrr),
    new Prisma.Decimal(0),
  );
  const totalWeightedMrr = accumulators.reduce(
    (sum, s) => sum.add(s.weightedMrr),
    new Prisma.Decimal(0),
  );

  return {
    stages: accumulators.map((s) => ({
      key: s.key,
      name: s.name,
      position: s.position,
      dealCount: s.dealCount,
      dealsWithoutMrr: s.dealsWithoutMrr,
      rawMrr: s.rawMrr.toNumber(),
      weightedMrr: s.weightedMrr.toNumber(),
    })),
    totalDealCount: deals.length,
    totalDealsWithoutMrr: deals.filter((d) => d.proposedMrr === null).length,
    totalRawMrr: totalRawMrr.toNumber(),
    totalWeightedMrr: totalWeightedMrr.toNumber(),
  };
}
