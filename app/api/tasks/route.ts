import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

/** INV-35. List and create. Completing a task is PATCH /api/tasks/[id]. */

export const runtime = "nodejs";

const TASK_INCLUDE = {
  owner: { select: { id: true, name: true } },
  company: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true } },
  deal: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

const listSchema = z.object({
  status: z.enum(["open", "completed", "all"]).default("open"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const createSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    dueDate: z.coerce.date().optional(),
    ownerId: z.string().trim().min(1).optional(),
    companyId: z.string().trim().min(1).optional(),
    contactId: z.string().trim().min(1).optional(),
    dealId: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) =>
      [data.companyId, data.contactId, data.dealId].filter(Boolean).length <=
      1,
    { message: "Link a task to at most one record", path: ["companyId"] },
  );

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = listSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { status, limit, offset } = parsed.data;
  const where: Prisma.TaskWhereInput =
    status === "open"
      ? { completedAt: null }
      : status === "completed"
        ? { completedAt: { not: null } }
        : {};

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit,
      include: TASK_INCLUDE,
    }),
    prisma.task.count({ where }),
  ]);

  return Response.json({ data, total });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { title, dueDate, ownerId, companyId, contactId, dealId } = parsed.data;

  const created = await withActor(user.id, async () => {
    return await prisma.task.create({
      data: {
        title,
        dueDate,
        ownerId: ownerId ?? user.id,
        companyId,
        contactId,
        dealId,
      },
      include: TASK_INCLUDE,
    });
  });

  return Response.json({ data: created }, { status: 201 });
}
