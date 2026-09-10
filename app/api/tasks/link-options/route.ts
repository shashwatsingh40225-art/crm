import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/**
 * INV-35. Options for the "link to a record" and "owner" pickers on the task
 * form. Read-only, and reads cross agent boundaries freely (ADR 0002) — this
 * queries Company/Contact/Deal, which Agents A and B own.
 */

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [companies, contacts, deals, owners] = await Promise.all([
    prisma.company.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.contact.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.deal.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return Response.json({ data: { companies, contacts, deals, owners } });
}
