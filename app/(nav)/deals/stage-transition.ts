export type StageTransitionFields = {
  ownerId?: string | null;
  primaryContactId?: string | null;
  lastOutreachAt?: string | null;
  nextAction?: string | null;
  nextActionDue?: string | null;
  verenaPlanInterest?: string | null;
  proposedTier?: string | null;
  proposedMrr?: number | null;
};

export type StageTransitionPayload = {
  toStageId: string;
  fields?: StageTransitionFields;
  outcome?: "won" | "lost";
  lostReason?: string;
};

export type StageTransitionResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number; error: string; fields?: Record<string, string[]> };

/**
 * Shared by the kanban board (INV-29) and the deal detail page's stage
 * control (INV-26/28) - one call site for the one gated transition route, so
 * there's no chance of the two UIs drifting on how a move is attempted.
 */
export async function postStageTransition(
  dealId: string,
  payload: StageTransitionPayload,
): Promise<StageTransitionResult> {
  const res = await fetch(`/api/deals/${dealId}/stage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: json?.error ?? "Could not move this deal.",
      fields: json?.fields,
    };
  }
  return { ok: true, data: json?.data };
}
