import { z } from "zod";

/**
 * Payload shape for INV-60 (scan ingest). This is Shashwat's specification,
 * not a contract confirmed against a real scanner - see the checkpoint
 * summary for what looks fragile about it.
 */
export const scanFindingSchema = z.object({
  framework: z.string().trim().min(1, "framework is required"),
  observation: z.string().trim().min(1, "observation is required"),
  evidence_url: z
    .string()
    .trim()
    .url("evidence_url must be a valid URL")
    .optional()
    .nullable(),
  // Optional with the same default as Finding.confidence in the schema
  // (medium), rather than required - a scanner that can't score its own
  // observation shouldn't fail the whole payload over it.
  confidence: z.enum(["high", "medium", "low"]).optional().default("medium"),
});

export const scanPayloadSchema = z.object({
  company_name: z.string().trim().min(1, "company_name is required"),
  domain: z.string().trim().min(1, "domain is required"),
  findings: z.array(scanFindingSchema).min(1, "at least one finding is required"),
});

export type ScanPayload = z.infer<typeof scanPayloadSchema>;
export type ScanFinding = z.infer<typeof scanFindingSchema>;

/**
 * Local to this route on purpose - not imported from Agent A's
 * app/api/companies/schema.ts, even though a normalizeDomain already exists
 * there for INV-22 dedupe. That module is outside app/api/webhooks/** and
 * app/api/findings/**, so this route does not depend on it (CLAUDE.md
 * section 7): if Agent A changes their normalization rule for the
 * companies-dedupe feature, this webhook's idempotency must not silently
 * change behavior underneath it.
 */
export function normalizeScanDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0];
}
