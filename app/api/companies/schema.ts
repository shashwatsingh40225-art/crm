import { CompanySize, LifecycleStage, Source } from "@prisma/client";
import { z } from "zod";

/**
 * Shared between the API route (server-side enforcement, CLAUDE.md section 6)
 * and the create/edit form (client-side presentation only). INV-17.
 */

// No protocol, no path - a bare hostname like the schema's Company.domain
// column expects. Deliberately permissive on TLD length/shape rather than
// trying to validate against the real public suffix list.
const HOSTNAME_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/i;

export const companySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  domain: z
    .string()
    .trim()
    .max(255)
    .regex(HOSTNAME_PATTERN, "Enter a valid domain, e.g. acme.com")
    .optional()
    .or(z.literal("")),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  size: z.enum(CompanySize).optional(),
  source: z.enum(Source),
  lifecycleStage: z.enum(LifecycleStage),
  ownerId: z.string().min(1).optional().or(z.literal("")),
});

export type CompanyFormValues = z.infer<typeof companySchema>;

/**
 * INV-22 (SHOULD). "acme.com", "www.acme.com" and "ACME.com" should all
 * collide for the dedupe warning - lowercase and strip a leading www.
 */
export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}
