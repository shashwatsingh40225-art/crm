import type { IcpFit, StageKey } from "@prisma/client";

export type GateField = {
  key:
    | "ownerId"
    | "primaryContactId"
    | "lastOutreachAt"
    | "nextAction"
    | "nextActionDue"
    | "verenaPlanInterest"
    | "proposedTier"
    | "proposedMrr"
    | "outcome"
    | "lostReason";
  label: string;
};

/**
 * Required-field gate per target stage (CLAUDE.md section 4 / INV-30).
 * Keyed by the stage being ENTERED - CLAUDE.md's "required to advance" on
 * row N is the gate for the move into row N+1, so it's indexed here by the
 * destination, which is what a transition actually needs to check. Gate off
 * Stage.key, never Stage.name.
 *
 * `icp_fit` and "at least one finding" (the Scanned -> Qualified gate) are
 * deliberately NOT here: both live on Company, which Agent A owns, not Deal.
 * Checked separately in the route as a hard block with no inline fill -
 * fixing them means editing the company record, not this deal, and this
 * route has no business writing to a table it doesn't own.
 */
export const STAGE_GATE_FIELDS: Partial<Record<StageKey, GateField[]>> = {
  contacted: [
    { key: "ownerId", label: "Owner" },
    { key: "primaryContactId", label: "Primary contact" },
  ],
  engaged: [{ key: "lastOutreachAt", label: "Last outreach date" }],
  evaluating: [
    { key: "nextAction", label: "Next action" },
    { key: "nextActionDue", label: "Next action due date" },
  ],
  proposal: [{ key: "verenaPlanInterest", label: "Verena plan interest" }],
  closed: [
    { key: "proposedTier", label: "Proposed tier" },
    { key: "proposedMrr", label: "Proposed MRR" },
    { key: "outcome", label: "Outcome (won or lost)" },
  ],
};

/**
 * Minimum ICP fit that clears the Scanned -> Qualified gate. Not just
 * "is the field set" - the seeded example (Tidewater Provisions, icpFit =
 * weak) is specifically a prospect that has been assessed and still fails
 * the gate, matching the exit criterion "ICP fit confirmed by a human"
 * being a real confirmation, not merely a filled-in field.
 */
export function icpFitQualifies(fit: IcpFit | null): boolean {
  return fit === "strong" || fit === "moderate";
}

/**
 * Fixed lost-reason categories (INV-31). The frozen schema has one
 * `lostReason: String?` column - no separate category/notes fields, and the
 * schema is frozen (CLAUDE.md section 8), so a category is encoded as a
 * literal label prefix on that single string ("Price", "Price — budget
 * wasn't approved this cycle") rather than as a real enum column. Flagged to
 * Shashwat as a deliberate encoding choice, not a silent one.
 */
export const LOST_REASON_CATEGORIES = [
  { value: "price", label: "Price" },
  { value: "timing", label: "Timing" },
  { value: "no_icp_fit", label: "No ICP fit" },
  { value: "competitor", label: "Competitor" },
  { value: "no_response", label: "No response" },
  { value: "other", label: "Other" },
] as const;

const LOST_REASON_LABELS = LOST_REASON_CATEGORIES.map((c) => c.label);

/** True if `text` starts with one of the fixed category labels. */
export function hasLostReasonCategory(text: string | null | undefined): boolean {
  if (!text) return false;
  return LOST_REASON_LABELS.some((label) => text.startsWith(label));
}

export function formatLostReason(categoryLabel: string, notes: string): string {
  return notes.trim() ? `${categoryLabel} — ${notes.trim()}` : categoryLabel;
}
