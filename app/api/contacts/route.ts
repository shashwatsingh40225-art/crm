import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { contactSchema } from "./schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();

  const parsed = contactSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { title, phone, ownerId, ...rest } = parsed.data;

  const existing = await prisma.contact.findFirst({
    where: { email: { equals: rest.email, mode: "insensitive" }, archivedAt: null },
  });
  if (existing) {
    return Response.json(
      { error: "Validation failed", fields: { email: ["Email is already in use"] } },
      { status: 422 },
    );
  }

  const contact = await withActor(user.id, async () => {
    return await prisma.contact.create({
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
