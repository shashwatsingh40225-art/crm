import { z } from "zod";

/**
 * Shared between app/api/deals/route.ts (create) and
 * app/api/deals/[id]/route.ts (update).
 *
 * `stageId` is deliberately not a field here at all - not omitted from the
 * request, absent from the schema. Stage changes must go through the gated
 * transition (INV-28/29/30, next slice), which writes a StageEvent. Letting
 * this endpoint set stage directly would let a deal skip the gate entirely.
 */
export const SOURCE_VALUES = [
  "outbound_scan",
  "inbound_signup",
  "referral",
] as const;

export const PLAN_TIER_VALUES = ["starter", "professional", "enterprise"] as const;

const dealFields = {
  name: z.string().trim().min(1, "Name is required").max(200),
  companyId: z.string().min(1, "Company is required"),
  primaryContactId: z.string().min(1).nullable(),
  source: z.enum(SOURCE_VALUES),
  ownerId: z.string().min(1).nullable(),
  proposedTier: z.enum(PLAN_TIER_VALUES).nullable(),
  proposedMrr: z.number().positive("Must be a positive number").nullable(),
  nextAction: z.string().trim().max(500).nullable(),
  nextActionDue: z.coerce.date().nullable(),
};

/** POST /api/deals - every field required (nullable ones may still be null). */
export const createDealSchema = z.object(dealFields);

/** PATCH /api/deals/[id] - every field optional; omitted keys are left alone. */
export const updateDealSchema = z.object(dealFields).partial();
