import { z } from "zod";

/** Payload shape for INV-62 (Verena signup ingest). */
export const signupPayloadSchema = z.object({
  email: z.string().trim().toLowerCase().email("email must be a valid email address"),
  name: z.string().trim().min(1, "name is required"),
  company_name: z.string().trim().min(1, "company_name is required"),
  // Same empty-string tolerance as scan's evidence_url (10 Sep checkpoint):
  // a signup form sending domain: "" falls back to name matching, not 422.
  domain: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  plan_interest: z.enum(["starter", "professional", "enterprise"]).optional(),
});

export type SignupPayload = z.infer<typeof signupPayloadSchema>;
