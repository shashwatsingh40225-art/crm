import { LifecycleStage } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

/**
 * INV-21. Deliberately separate from the full PATCH /api/companies/[id]
 * route (INV-17) - the inline dropdown on the detail page changes one field
 * without going through the whole edit form, so it gets its own minimal
 * endpoint rather than the full companySchema.
 *
 * The before/after AuditEvent values come for free from the audit extension
 * on this update - nothing extra to write here for that AC.
 */
export const runtime = "nodejs";

const bodySchema = z.object({ lifecycleStage: z.enum(LifecycleStage) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const company = await withActor(user.id, async () => {
    return await prisma.company.update({
      where: { id },
      data: { lifecycleStage: parsed.data.lifecycleStage },
    });
  });

  return Response.json({ data: company });
}
