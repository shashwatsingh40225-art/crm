import { z } from "zod";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

/**
 * INV-61 - approve. The moment a scanned prospect enters the pipeline: every
 * pending Finding is marked approved, the reviewer's ICP-fit call is
 * recorded on the Company, and a Deal is created at Scanned with its first
 * StageEvent - mirroring the entry-stage write in app/api/deals/route.ts
 * (Agent B's file, read for the pattern, not imported from).
 *
 * Session-gated deliberately (middleware.ts / lib/supabase/middleware.ts,
 * INV-65): unlike the scan-ingest webhook, this is a human action and the
 * whole point is recording who approved.
 */
export const runtime = "nodejs";

const approveSchema = z.object({
  icpFit: z.enum(["strong", "moderate", "weak", "none"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { companyId } = await params;

  const parsed = approveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { findings: { where: { reviewStatus: "pending" } } },
  });
  if (!company || company.archivedAt) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }
  if (company.findings.length === 0) {
    return Response.json(
      { error: "This company has no pending findings to review" },
      { status: 422 },
    );
  }

  const scannedStage = await prisma.stage.findFirst({ where: { key: "scanned" } });
  if (!scannedStage) {
    return Response.json({ error: "Pipeline is not seeded" }, { status: 500 });
  }

  const deal = await withActor(user.id, async () => {
    await prisma.company.update({
      where: { id: companyId },
      data: { icpFit: parsed.data.icpFit },
    });

    // Individual updates rather than updateMany, so each Finding gets its
    // own AuditEvent naming this reviewer - a bulk update would log one row
    // with entityId "(bulk)" and lose that per-row provenance.
    for (const finding of company.findings) {
      await prisma.finding.update({
        where: { id: finding.id },
        data: { reviewStatus: "approved", reviewedById: user.id, reviewedAt: new Date() },
      });
    }

    const created = await prisma.deal.create({
      data: {
        name: company.name,
        companyId,
        stageId: scannedStage.id,
        source: "outbound_scan",
      },
    });

    await prisma.stageEvent.create({
      data: {
        dealId: created.id,
        fromStageId: null,
        toStageId: scannedStage.id,
        changedById: user.id,
      },
    });

    return created;
  });

  return Response.json({ data: deal }, { status: 201 });
}
