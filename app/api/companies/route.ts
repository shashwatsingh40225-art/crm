import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { companySchema } from "./schema";

// Audit extension carries the actor through AsyncLocalStorage, which is lost
// on Edge (CLAUDE.md section 5) - every mutating route pins Node.
export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();

  const parsed = companySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { domain, industry, ownerId, ...rest } = parsed.data;

  const company = await withActor(user.id, async () => {
    return await prisma.company.create({
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
