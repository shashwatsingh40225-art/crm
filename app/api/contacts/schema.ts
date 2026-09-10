import { LifecycleStage } from "@prisma/client";
import { z } from "zod";

/**
 * Shared between the API route and the create/edit form (INV-20). Same
 * pattern as app/api/companies/schema.ts.
 */
export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(255),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  companyId: z.string().min(1, "Company is required"),
  lifecycleStage: z.enum(LifecycleStage),
  ownerId: z.string().min(1).optional().or(z.literal("")),
});

export type ContactFormValues = z.infer<typeof contactSchema>;
