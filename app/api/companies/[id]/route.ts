import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { companySchema } from "../schema";

export const runtime = "nodejs";

/**
 * DELETE = archive (INV-53 / ADR 0003). Never a real delete - onDelete:
 * Cascade on Contact/Deal/Activity/Task/Finding would take everything under
 * this company with it, and a hard delete inside that cascade never touches
 * the audit extension (it only sees the top-level query), so the cascaded
 * rows would leave no AuditEvent at all.
 *
 * A Company's Deals are Agent B's - archiving a Company must not silently
 * archive them. Instead, an open one (no outcome yet) blocks the archive
 * with a 409 naming it, same as the stage gate returns 422 with the missing
 * fields rather than refusing silently (CLAUDE.md section 4/6).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true, archivedAt: true },
  });
  if (!company || company.archivedAt) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const openDeals = await prisma.deal.findMany({
    where: { companyId: id, archivedAt: null, outcome: null },
    select: { id: true, name: true },
  });
  if (openDeals.length > 0) {
    return Response.json(
      { error: "Company has open deals", deals: openDeals },
      { status: 409 },
    );
  }

  const archived = await withActor(user.id, async () => {
    const now = new Date();
    const updated = await prisma.company.update({
      where: { id },
      data: { archivedAt: now },
    });
    // Cascades the archive to this company's contacts (ticket scope) -
    // deliberately not to its deals, per the check above.
    await prisma.contact.updateMany({
      where: { companyId: id, archivedAt: null },
      data: { archivedAt: now },
    });
    return updated;
  });

  return Response.json({ data: archived });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser();
  const { id } = await params;

  const parsed = companySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { domain, industry, ownerId, ...rest } = parsed.data;

  const company = await withActor(user.id, async () => {
    return await prisma.company.update({
      where: { id },
      data: {
        ...rest,
        domain: domain || null,
        industry: industry || null,
        ownerId: ownerId || null,
      },
    });
  });

  return Response.json({ data: company });
}
