import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

/** INV-35. Complete / reopen a task — the only mutation a task takes after creation. */

export const runtime = "nodejs";

const TASK_INCLUDE = {
  owner: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true } },
  deal: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

const patchSchema = z.object({
  completed: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const updated = await withActor(user.id, async () => {
    return await prisma.task.update({
      where: { id },
      data: { completedAt: parsed.data.completed ? new Date() : null },
      include: TASK_INCLUDE,
    });
  });

  return Response.json({ data: updated });
}
