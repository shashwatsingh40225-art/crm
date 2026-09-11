import { z } from "zod";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";

/**
 * PATCH /api/companies/bulk (INV-54) - bulk owner reassignment from the
 * company list's row-selection action bar.
 *
 * Deliberately does NOT use `prisma.company.updateMany()`. INV-53 already
 * showed what that produces: one AuditEvent for the whole batch, with
 * `entityId: "(bulk)"` - acceptable for a cascade, not for an audit trail
 * whose whole point here is "who reassigned which record." So this updates
 * each row individually, inside a single `withActor` scope (same fix Agent D
 * used for INV-61) - one round trip to open the actor context, N individual
 * updates, N real AuditEvents.
 *
 * Ids are looked up with `archivedAt: null` first rather than passed straight
 * to `updateMany`/a loop of `update`s - an archived id (stale tab, id typed by
 * hand) is silently dropped rather than reassigning a record nobody can see
 * anymore.
 */
export const runtime = "nodejs";

const bulkOwnerSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  ownerId: z.string().min(1),
});

export async function PATCH(request: Request) {
  const user = await requireUser();

  const parsed = bulkOwnerSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const owner = await prisma.user.findUnique({ where: { id: parsed.data.ownerId } });
  if (!owner) {
    return Response.json(
      { error: "Validation failed", fields: { ownerId: ["Owner not found"] } },
      { status: 422 },
    );
  }

  const companies = await prisma.company.findMany({
    where: { id: { in: parsed.data.ids }, archivedAt: null },
    select: { id: true },
  });

  const updated = await withActor(user.id, async () => {
    const results = [];
    for (const company of companies) {
      results.push(
        await prisma.company.update({
          where: { id: company.id },
          data: { ownerId: owner.id },
        }),
      );
    }
    return results;
  });

  return Response.json({ data: updated, total: updated.length });
}
