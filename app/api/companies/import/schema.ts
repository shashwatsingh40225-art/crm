import { Source } from "@prisma/client";
import { z } from "zod";
import { companySchema, type CompanyFormValues } from "../schema";

/**
 * CSV import contract (INV-23). Imported by BOTH the API route and the
 * client-side importer, so the preview's verdict on a row and the server's
 * verdict on the same row come from one function rather than two
 * implementations that drift.
 *
 * Dedupe is not re-implemented here - normalizeDomain() from INV-22 stays
 * the single definition of "same domain" and both callers use it.
 */

/** One CSV data row, after column mapping. `lineNumber` is the line in the file. */
export type ImportRow = {
  lineNumber: number;
  name: string;
  domain: string;
  industry: string;
  source: string;
};

export type RowVerdict =
  | { ok: true; data: CompanyFormValues }
  | { ok: false; message: string };

export type ImportRowResult =
  | { lineNumber: number; status: "created"; id: string; name: string }
  | { lineNumber: number; status: "error"; message: string }
  | { lineNumber: number; status: "duplicate"; message: string; existingId: string };

export type ImportSummary = {
  created: number;
  reported: number;
  results: ImportRowResult[];
};

export const importRequestSchema = z.object({
  rows: z
    .array(
      z.object({
        lineNumber: z.number().int().positive(),
        name: z.string(),
        domain: z.string(),
        industry: z.string(),
        source: z.string(),
      }),
    )
    .min(1, "The file has no data rows")
    .max(1000, "Imports are capped at 1000 rows per file"),
  /** INV-22 says warn, don't hard-block - so duplicates are skippable, not forbidden. */
  includeDuplicates: z.boolean(),
});

/**
 * A blank source column means "not mapped", which falls back to the schema
 * default. A mapped-but-unrecognised value is a row error rather than a
 * silent fallback - the ticket's whole point is that nothing is swallowed.
 */
function parseSource(raw: string): Source | null {
  const value = raw.trim();
  if (value === "") return Source.outbound_scan;

  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_");
  const match = Object.values(Source).find((s) => s === normalized);
  return match ?? null;
}

/** Validates one mapped row against the same zod schema the create form uses. */
export function validateImportRow(row: ImportRow): RowVerdict {
  if (row.name.trim() === "" && row.domain.trim() === "" && row.industry.trim() === "") {
    return { ok: false, message: "Empty row" };
  }

  const source = parseSource(row.source);
  if (!source) {
    return { ok: false, message: `Unrecognised source "${row.source.trim()}"` };
  }

  const parsed = companySchema.safeParse({
    name: row.name,
    domain: row.domain,
    industry: row.industry,
    source,
    lifecycleStage: "prospect",
    ownerId: "",
  });

  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue.path.join(".");
    return { ok: false, message: field ? `${field}: ${issue.message}` : issue.message };
  }

  return { ok: true, data: parsed.data };
}
