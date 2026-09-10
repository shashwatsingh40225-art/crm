import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { contactSchema } from "../schema";

export const runtime = "nodejs";

/**
 * DELETE = archive (INV-53 / ADR 0003), same pattern as
 * app/api/companies/[id]/route.ts. No open-deal check here - that rule is
 * scoped to archiving a Company (which cascades to its contacts); archiving
 * a contact directly doesn't touch any deal, including ones it's the primary
 * contact on.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    select: { id: true, archivedAt: true },
  });
  if (!contact || contact.archivedAt) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const archived = await withActor(user.id, async () => {
    return await prisma.contact.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  });

  return Response.json({ data: archived });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { title, phone, ownerId, ...rest } = parsed.data;

  const existing = await prisma.contact.findFirst({
    where: {
      email: { equals: rest.email, mode: "insensitive" },
      id: { not: id },
      archivedAt: null,
    },
  });
  if (existing) {
    return Response.json(
      { error: "Validation failed", fields: { email: ["Email is already in use"] } },
      { status: 422 },
    );
  }

  const contact = await withActor(user.id, async () => {
    return await prisma.contact.update({
      where: { id },
      data: {
        ...rest,
        title: title || null,
        phone: phone || null,
        ownerId: ownerId || null,
      },
    });
  });

  return Response.json({ data: contact });
}
