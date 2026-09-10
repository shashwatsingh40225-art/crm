"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import type { DealOutcome } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { OutcomeBadge } from "@/components/ui/badges";
import { postStageTransition } from "./stage-transition";

/**
 * INV-31: closed deals are read-only except for reopen. Reopen always
 * returns to the deal's prior stage (not an arbitrary one) and goes through
 * the same /stage route as everything else - it's a backward move by
 * position (closed is highest), so it skips the gate and just clears
 * outcome/lostReason/closedAt server-side.
 */
export function ClosedBanner({
  dealId,
  outcome,
  lostReason,
  priorStageId,
}: {
  dealId: string;
  outcome: DealOutcome;
  lostReason: string | null;
  priorStageId: string;
}) {
  const router = useRouter();
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reopen() {
    setReopening(true);
    setError(null);

    const result = await postStageTransition(dealId, { toStageId: priorStageId });

    setReopening(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Lock className="text-muted-foreground size-4 shrink-0" />
        <span>This deal is closed —</span>
        <OutcomeBadge outcome={outcome} />
        {outcome === "lost" && lostReason ? (
          <span className="text-muted-foreground">{lostReason}</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
        <Button type="button" variant="outline" size="sm" onClick={reopen} disabled={reopening}>
          {reopening ? "Reopening…" : "Reopen"}
        </Button>
      </div>
    </div>
  );
}
