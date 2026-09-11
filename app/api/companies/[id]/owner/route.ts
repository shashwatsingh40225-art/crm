import { z } from "zod";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

/**
 * INV-54. Same shape as ../lifecycle-stage/route.ts: a minimal endpoint for
 * the single-field inline editor on the detail page, separate from the full
 * PATCH /api/companies/[id] (which requires the whole companySchema).
 */
export const runtime = "nodejs";

const bodySchema = z.object({ ownerId: z.string().min(1).nullable() });

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

  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true, archivedAt: true },
  });
  if (!company || company.archivedAt) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: parsed.data.ownerId } });
    if (!owner) {
      return Response.json(
        { error: "Validation failed", fields: { ownerId: ["Owner not found"] } },
        { status: 422 },
      );
    }
  }

  const updated = await withActor(user.id, async () => {
    return await prisma.company.update({
      where: { id },
      data: { ownerId: parsed.data.ownerId },
    });
  });

  return Response.json({ data: updated });
}
