import { z } from "zod";

/**
 * Payload shape for INV-60 (scan ingest). This is Shashwat's specification,
 * not a contract confirmed against a real scanner - see the checkpoint
 * summary for what looks fragile about it.
 */
export const scanFindingSchema = z.object({
  framework: z.string().trim().min(1, "framework is required"),
  observation: z.string().trim().min(1, "observation is required"),
  // Empty string is treated as absent, not malformed - real senders emit ""
  // constantly and a 422 on an optional field is a bad front door (Shashwat,
  // 10 Sep checkpoint).
  evidence_url: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null))
    .pipe(z.string().url("evidence_url must be a valid URL").nullable()),
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
