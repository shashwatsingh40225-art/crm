import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { companySchema } from "../schema";

export const runtime = "nodejs";

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
