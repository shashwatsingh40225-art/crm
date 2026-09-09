import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/stages (INV-24).
 *
 * Read-only - nothing here mutates, so no withActor/audit wrapping applies.
 * Stages themselves are seeded by Foundation (prisma/seed.ts, owned there per
 * CLAUDE.md section 7); this route just exposes them ordered by position for
 * the board (INV-29) and the deal list filters (INV-25).
 *
 * `isTerminal` is derived, not stored: the frozen schema has one terminal
 * StageKey (`closed`) covering both Won and Lost (CLAUDE.md section 4, row 7),
 * with Deal.outcome distinguishing them - not two separate stage rows.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const stages = await prisma.stage.findMany({
    orderBy: { position: "asc" },
  });

  const data = stages.map((s) => ({
    ...s,
    isTerminal: s.key === "closed",
  }));

  return Response.json({ data, total: data.length });
}
