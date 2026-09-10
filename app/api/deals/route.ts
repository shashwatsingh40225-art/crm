import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { createDealSchema } from "./schema";

export const runtime = "nodejs";

/**
 * POST /api/deals (INV-27).
 *
 * The opening stage is derived from `source`, never accepted from the
 * client: inbound signups enter at Engaged and legitimately skip Scanned and
 * Contacted, everything else (outbound scans and referrals) enters at
 * Scanned (CLAUDE.md D3 / section 4). Referral isn't named explicitly in the
 * CLAUDE.md rule - grouped with outbound here because a referred prospect
 * still needs the same ICP-fit confirmation before it's a qualified deal.
 *
 * Every successful transition writes a StageEvent (CLAUDE.md section 4) -
 * including the deal's first entry into the pipeline, so this writes one
 * alongside the Deal itself, both inside the same withActor scope.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = createDealSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const data = parsed.data;

  if (data.primaryContactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: data.primaryContactId },
      select: { companyId: true },
    });
    if (!contact || contact.companyId !== data.companyId) {
      return Response.json(
        {
          error: "Validation failed",
          fields: { primaryContactId: ["Contact does not belong to this company"] },
        },
        { status: 422 },
      );
    }
  }

  const entryKey = data.source === "inbound_signup" ? "engaged" : "scanned";
  const entryStage = await prisma.stage.findFirst({ where: { key: entryKey } });
  if (!entryStage) {
    return Response.json({ error: "Pipeline is not seeded" }, { status: 500 });
  }

  const deal = await withActor(user.id, async () => {
    const created = await prisma.deal.create({
      data: {
        name: data.name,
        companyId: data.companyId,
        primaryContactId: data.primaryContactId ?? undefined,
        stageId: entryStage.id,
        source: data.source,
        ownerId: data.ownerId ?? undefined,
        proposedTier: data.proposedTier ?? undefined,
        proposedMrr: data.proposedMrr ?? undefined,
        nextAction: data.nextAction ?? undefined,
        nextActionDue: data.nextActionDue ?? undefined,
      },
    });

    await prisma.stageEvent.create({
      data: {
        dealId: created.id,
        fromStageId: null,
        toStageId: entryStage.id,
        changedById: user.id,
      },
    });

    return created;
  });

  return Response.json({ data: deal }, { status: 201 });
}
