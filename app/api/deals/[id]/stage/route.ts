import { z } from "zod";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";
import { PLAN_TIER_VALUES } from "../../schema";
import { STAGE_GATE_FIELDS, icpFitQualifies, hasLostReasonCategory } from "../../gates";

export const runtime = "nodejs";

const transitionSchema = z.object({
  toStageId: z.string().min(1),
  /** Only the gate fields missing for this specific move need to be sent. */
  fields: z
    .object({
      ownerId: z.string().min(1).nullable(),
      primaryContactId: z.string().min(1).nullable(),
      lastOutreachAt: z.coerce.date().nullable(),
      nextAction: z.string().trim().max(500).nullable(),
      nextActionDue: z.coerce.date().nullable(),
      verenaPlanInterest: z.enum(PLAN_TIER_VALUES).nullable(),
      proposedTier: z.enum(PLAN_TIER_VALUES).nullable(),
      proposedMrr: z.number().positive().nullable(),
    })
    .partial()
    .optional(),
  outcome: z.enum(["won", "lost"]).optional(),
  lostReason: z.string().trim().max(1000).optional(),
});

/**
 * POST /api/deals/[id]/stage (INV-28, INV-29, INV-30, INV-31).
 *
 * The single gated transition path - the kanban drag (INV-29), the deal
 * detail page's stage control (INV-26/28), and reopen (INV-31) all call
 * this, so there is exactly one place the gate logic and the StageEvent
 * write live. A stage is a business state, not a dropdown value (CLAUDE.md
 * section 4): a forward move whose target stage has missing required fields
 * returns 422 naming them; the same request can supply those fields to
 * complete the move in one action (the blocking modal's "fill and move"
 * flow). Backward moves skip the gate entirely, but still write a
 * StageEvent like any other transition - reopening a closed deal is a
 * backward move by position (closed is the highest), so it's covered by the
 * same branch, not a separate code path.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;

  const parsed = transitionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const body = parsed.data;

  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      stage: true,
      company: {
        select: { icpFit: true, _count: { select: { findings: true } } },
      },
    },
  });
  if (!deal) {
    return Response.json({ error: "Deal not found" }, { status: 404 });
  }

  const toStage = await prisma.stage.findUnique({ where: { id: body.toStageId } });
  if (!toStage) {
    return Response.json(
      { error: "Validation failed", fields: { toStageId: ["Unknown stage"] } },
      { status: 422 },
    );
  }

  if (toStage.id === deal.stageId) {
    return Response.json({ data: deal });
  }

  const isBackward = toStage.position < deal.stage.position;
  // Closed is the highest position, so any move off it is a backward move by
  // definition - this is INV-31's "reopen", not a normal drag. outcome,
  // lostReason and closedAt are cleared so the deal doesn't keep reading as
  // Won/Lost while sitting in an open stage (schema comment on
  // Deal.outcome: "Null while the deal is still open").
  const isReopen = deal.stage.key === "closed" && toStage.key !== "closed";

  if (!isBackward) {
    const missing: { field: string; label: string }[] = [];

    if (toStage.key === "qualified") {
      if (!icpFitQualifies(deal.company.icpFit)) {
        missing.push({
          field: "companyIcpFit",
          label:
            "Company ICP fit must be confirmed as Strong or Moderate (edit the company record)",
        });
      }
      if (deal.company._count.findings < 1) {
        missing.push({
          field: "companyFindings",
          label: "Company needs at least one finding (add on the company record)",
        });
      }
    }

    const mergedValues: Record<string, unknown> = {
      ownerId: body.fields?.ownerId !== undefined ? body.fields.ownerId : deal.ownerId,
      primaryContactId:
        body.fields?.primaryContactId !== undefined
          ? body.fields.primaryContactId
          : deal.primaryContactId,
      lastOutreachAt:
        body.fields?.lastOutreachAt !== undefined
          ? body.fields.lastOutreachAt
          : deal.lastOutreachAt,
      nextAction:
        body.fields?.nextAction !== undefined ? body.fields.nextAction : deal.nextAction,
      nextActionDue:
        body.fields?.nextActionDue !== undefined
          ? body.fields.nextActionDue
          : deal.nextActionDue,
      verenaPlanInterest:
        body.fields?.verenaPlanInterest !== undefined
          ? body.fields.verenaPlanInterest
          : deal.verenaPlanInterest,
      proposedTier:
        body.fields?.proposedTier !== undefined ? body.fields.proposedTier : deal.proposedTier,
      proposedMrr:
        body.fields?.proposedMrr !== undefined ? body.fields.proposedMrr : deal.proposedMrr,
      outcome: body.outcome ?? deal.outcome,
      lostReason: body.lostReason ?? deal.lostReason,
    };

    const gateFields = STAGE_GATE_FIELDS[toStage.key] ?? [];
    for (const f of gateFields) {
      const value = mergedValues[f.key];
      if (value === null || value === undefined || value === "") {
        missing.push({ field: f.key, label: f.label });
      }
    }

    if (toStage.key === "closed" && mergedValues.outcome === "lost") {
      if (!mergedValues.lostReason) {
        missing.push({ field: "lostReason", label: "Lost reason" });
      } else if (!hasLostReasonCategory(mergedValues.lostReason as string)) {
        missing.push({
          field: "lostReason",
          label: "Lost reason must start with one of the fixed categories",
        });
      }
    }

    if (missing.length > 0) {
      return Response.json(
        {
          error: `Missing required fields to enter ${toStage.name}`,
          fields: Object.fromEntries(missing.map((m) => [m.field, [m.label]])),
        },
        { status: 422 },
      );
    }
  }

  const updated = await withActor(user.id, async () => {
    const patched = await prisma.deal.update({
      where: { id },
      data: {
        stageId: toStage.id,
        ownerId: body.fields?.ownerId,
        primaryContactId: body.fields?.primaryContactId,
        lastOutreachAt: body.fields?.lastOutreachAt,
        nextAction: body.fields?.nextAction,
        nextActionDue: body.fields?.nextActionDue,
        verenaPlanInterest: body.fields?.verenaPlanInterest,
        proposedTier: body.fields?.proposedTier,
        proposedMrr: body.fields?.proposedMrr,
        outcome: isReopen ? null : body.outcome,
        lostReason: isReopen ? null : body.lostReason,
        closedAt: toStage.key === "closed" ? new Date() : isReopen ? null : undefined,
      },
    });

    await prisma.stageEvent.create({
      data: {
        dealId: id,
        fromStageId: deal.stageId,
        toStageId: toStage.id,
        changedById: user.id,
      },
    });

    return patched;
  });

  return Response.json({ data: updated });
}
