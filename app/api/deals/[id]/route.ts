import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { updateDealSchema } from "../schema";

export const runtime = "nodejs";

/**
 * PATCH /api/deals/[id] (INV-26 inline next-action edit, INV-27 edit form).
 *
 * `stageId` is not in updateDealSchema at all - this route cannot move a
 * deal between stages under any payload. That happens through the gated
 * transition in INV-28/29/30, next slice, which is also the only path that
 * writes a StageEvent for an existing deal.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.deal.findUnique({
    where: { id },
    include: { stage: true },
  });
  if (!existing) {
    return Response.json({ error: "Deal not found" }, { status: 404 });
  }

  // INV-31: closed deals are read-only except for reopen, which goes
  // through /stage, not this route.
  if (existing.stage.key === "closed") {
    return Response.json(
      { error: "This deal is closed. Reopen it before editing." },
      { status: 422 },
    );
  }

  const parsed = updateDealSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const data = parsed.data;

  const companyId = data.companyId ?? existing.companyId;
  if (data.primaryContactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: data.primaryContactId },
      select: { companyId: true },
    });
    if (!contact || contact.companyId !== companyId) {
      return Response.json(
        {
          error: "Validation failed",
          fields: { primaryContactId: ["Contact does not belong to this company"] },
        },
        { status: 422 },
      );
    }
  }

  const updated = await withActor(user.id, async () => {
    return await prisma.deal.update({
      where: { id },
      data: {
        name: data.name,
        companyId: data.companyId,
        primaryContactId: data.primaryContactId,
        source: data.source,
        ownerId: data.ownerId,
        proposedTier: data.proposedTier,
        proposedMrr: data.proposedMrr,
        nextAction: data.nextAction,
        nextActionDue: data.nextActionDue,
      },
    });
  });

  return Response.json({ data: updated });
}
