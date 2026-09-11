import { z } from "zod";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

/**
 * INV-54. Same shape as ../lifecycle-stage/route.ts and
 * ../../companies/[id]/owner/route.ts.
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

  const contact = await prisma.contact.findUnique({
    where: { id },
    select: { id: true, archivedAt: true },
  });
  if (!contact || contact.archivedAt) {
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
    return await prisma.contact.update({
      where: { id },
      data: { ownerId: parsed.data.ownerId },
    });
  });

  return Response.json({ data: updated });
}
