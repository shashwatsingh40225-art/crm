import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth";

/**
 * INV-33 / INV-34. Backs the quick-add form and the reverse-chronological
 * feed inside <ActivityTimeline> (components/ui/activity-timeline.tsx).
 *
 * GET rolls a company's activity up to include its contacts' and deals'
 * activity too (INV-34 AC: "the company timeline rolls up activity from its
 * contacts and deals"). Contact and deal views are a direct filter.
 */

export const runtime = "nodejs";

const ACTIVITY_TYPES = [
  "call",
  "email",
  "meeting",
  "note",
  "demo",
  "signup",
] as const;

const listSchema = z.object({
  entityType: z.enum(["company", "contact", "deal"]),
  entityId: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const createSchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES),
    subject: z.string().trim().min(1, "Subject is required").max(200),
    body: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .transform((v) => (v ? v : undefined)),
    occurredAt: z.coerce.date().optional(),
    companyId: z.string().trim().min(1).optional(),
    contactId: z.string().trim().min(1).optional(),
    dealId: z.string().trim().min(1).optional(),
  })
  .refine(
    (data) =>
      [data.companyId, data.contactId, data.dealId].filter(Boolean).length ===
      1,
    {
      message: "Exactly one of company, contact or deal is required",
      path: ["companyId"],
    },
  );

function whereForEntity(
  entityType: "company" | "contact" | "deal",
  entityId: string,
): Prisma.ActivityWhereInput {
  if (entityType === "contact") return { contactId: entityId };
  if (entityType === "deal") return { dealId: entityId };
  return {
    OR: [
      { companyId: entityId },
      { contact: { companyId: entityId } },
      { deal: { companyId: entityId } },
    ],
  };
}

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

  const { entityType, entityId, limit, offset } = parsed.data;
  const where = whereForEntity(entityType, entityId);

  const [data, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit,
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.activity.count({ where }),
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

  const { type, subject, body, occurredAt, companyId, contactId, dealId } =
    parsed.data;

  const created = await withActor(user.id, async () => {
    return await prisma.activity.create({
      data: {
        type,
        subject,
        body,
        occurredAt: occurredAt ?? new Date(),
        companyId,
        contactId,
        dealId,
        createdById: user.id,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  });

  return Response.json({ data: created }, { status: 201 });
}
