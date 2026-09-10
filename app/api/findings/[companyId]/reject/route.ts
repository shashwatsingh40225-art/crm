import { z } from "zod";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

/**
 * INV-61 - reject. Every pending Finding is marked rejected and the Company
 * is archived; no Deal is ever created on this path.
 *
 * The required rejection reason has nowhere to live on Company or Finding -
 * the frozen schema (CLAUDE.md section 8) has no such field, and this isn't
 * worth stopping the slice to ask for one: it fits the existing Activity
 * table (a logged interaction against a Company, CONTEXT.md), which Agent D
 * is already permitted to write from this route (CLAUDE.md section 7). Noted
 * here rather than silently decided - flagged again in the checkpoint.
 *
 * Session-gated deliberately, same reasoning as approve/route.ts.
 */
export const runtime = "nodejs";

const rejectSchema = z.object({
  reason: z.string().trim().min(1, "A rejection reason is required").max(1000),
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

  const parsed = rejectSchema.safeParse(await request.json().catch(() => null));
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

  const archived = await withActor(user.id, async () => {
    for (const finding of company.findings) {
      await prisma.finding.update({
        where: { id: finding.id },
        data: { reviewStatus: "rejected", reviewedById: user.id, reviewedAt: new Date() },
      });
    }

    await prisma.activity.create({
      data: {
        type: "note",
        subject: "Scan rejected",
        body: parsed.data.reason,
        companyId,
        occurredAt: new Date(),
        createdById: user.id,
      },
    });

    return await prisma.company.update({
      where: { id: companyId },
      data: { archivedAt: new Date() },
    });
  });

  return Response.json({ data: archived });
}
