import { LifecycleStage } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

// INV-21. See app/api/companies/[id]/lifecycle-stage/route.ts for the
// rationale - same shape, Contact instead of Company.
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

  const contact = await withActor(user.id, async () => {
    return await prisma.contact.update({
      where: { id },
      data: { lifecycleStage: parsed.data.lifecycleStage },
    });
  });

  return Response.json({ data: contact });
}
