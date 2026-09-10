import type { FindingConfidence } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ReviewQueueFinding = {
  id: string;
  framework: string;
  observation: string;
  evidenceUrl: string | null;
  confidence: FindingConfidence;
};

export type ReviewQueueRow = {
  companyId: string;
  companyName: string;
  domain: string | null;
  pendingCount: number;
  highestConfidence: FindingConfidence;
  arrivedAt: Date;
  findings: ReviewQueueFinding[];
};

const CONFIDENCE_RANK: Record<FindingConfidence, number> = { high: 3, medium: 2, low: 1 };

/**
 * Companies waiting on a human decision (INV-61): not archived, with at
 * least one pending Finding. A company drops off this list the moment its
 * findings are no longer pending - approve and reject both flip every
 * pending Finding, so there is no separate "remove from queue" step.
 *
 * Ordered oldest-first by the earliest pending Finding's arrival, not by
 * Company.createdAt - a company can be re-scanned with new findings well
 * after it was first created.
 */
export async function getReviewQueueRows(): Promise<ReviewQueueRow[]> {
  const companies = await prisma.company.findMany({
    where: { archivedAt: null, findings: { some: { reviewStatus: "pending" } } },
    include: { findings: { orderBy: { createdAt: "asc" } } },
  });

  return companies
    .map((company) => {
      const pending = company.findings.filter((f) => f.reviewStatus === "pending");
      const highestConfidence = pending.reduce<FindingConfidence>(
        (max, f) => (CONFIDENCE_RANK[f.confidence] > CONFIDENCE_RANK[max] ? f.confidence : max),
        pending[0]?.confidence ?? "low",
      );

      return {
        companyId: company.id,
        companyName: company.name,
        domain: company.domain,
        pendingCount: pending.length,
        highestConfidence,
        arrivedAt: pending[0]?.createdAt ?? company.createdAt,
        // "Every Finding", not just the pending ones - a re-review after a
        // partial prior decision should still show the full history.
        findings: company.findings.map((f) => ({
          id: f.id,
          framework: f.framework,
          observation: f.observation,
          evidenceUrl: f.evidenceUrl,
          confidence: f.confidence,
        })),
      };
    })
    .sort((a, b) => a.arrivedAt.getTime() - b.arrivedAt.getTime());
}

/**
 * For the sidebar's pending-review count badge. That badge lives in
 * app/(nav)/nav-items.ts and app/(nav)/layout.tsx, which are Foundation's
 * files (CLAUDE.md section 7) - exported here so Foundation can wire it in
 * without duplicating the query.
 */
export async function getPendingReviewCount(): Promise<number> {
  return prisma.company.count({
    where: { archivedAt: null, findings: { some: { reviewStatus: "pending" } } },
  });
}
