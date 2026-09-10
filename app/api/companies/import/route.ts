import { prisma } from "@/lib/db";
import { withActor } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { normalizeDomain } from "../schema";
import {
  importRequestSchema,
  validateImportRow,
  type ImportRowResult,
} from "./schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireUser();

  const parsed = importRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { rows, includeDuplicates } = parsed.data;

  // The dedupe index for the whole file, built once rather than one query per
  // row. INV-22's normalizeDomain decides what "same domain" means; this
  // route reuses it rather than defining a second rule.
  const existing = await prisma.company.findMany({
    where: { domain: { not: null } },
    select: { id: true, domain: true },
  });

  const idByDomain = new Map<string, string>();
  for (const company of existing) {
    if (company.domain) idByDomain.set(normalizeDomain(company.domain), company.id);
  }

  const results = await withActor(user.id, async () => {
    const out: ImportRowResult[] = [];

    for (const row of rows) {
      const verdict = validateImportRow(row);

      if (!verdict.ok) {
        out.push({
          lineNumber: row.lineNumber,
          status: "error",
          message: verdict.message,
        });
        continue;
      }

      const key = verdict.data.domain ? normalizeDomain(verdict.data.domain) : null;
      const clashesWith = key ? idByDomain.get(key) : undefined;

      if (clashesWith && !includeDuplicates) {
        out.push({
          lineNumber: row.lineNumber,
          status: "duplicate",
          message: "A company already uses this domain",
          existingId: clashesWith,
        });
        continue;
      }

      // Awaited inside the withActor scope, so nothing lazy escapes it and
      // the AuditEvent records this user (CLAUDE.md section 5).
      const created = await prisma.company.create({
        data: {
          name: verdict.data.name,
          domain: verdict.data.domain || null,
          industry: verdict.data.industry || null,
          source: verdict.data.source,
          lifecycleStage: verdict.data.lifecycleStage,
        },
      });

      // So a later row in the same file collides with this one too, not just
      // with rows that were already in the database.
      if (key) idByDomain.set(key, created.id);

      out.push({
        lineNumber: row.lineNumber,
        status: "created",
        id: created.id,
        name: created.name,
      });
    }

    return out;
  });

  return Response.json({
    data: {
      created: results.filter((r) => r.status === "created").length,
      reported: results.filter((r) => r.status !== "created").length,
      results,
    },
  });
}
