"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Stage } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContactOption, OwnerOption } from "./deal-form";
import { postStageTransition } from "./stage-transition";
import { StageGateModal } from "./stage-gate-modal";

type PendingGate = {
  toStageId: string;
  stageName: string;
  missingFields: Record<string, string[]>;
};

/**
 * INV-28's "the detail-page change" - the second call site for the same
 * gated transition route the board uses (INV-29), so both paths write a
 * StageEvent through identical logic.
 */
export function StagePicker({
  dealId,
  companyId,
  currentStageId,
  stages,
  owners,
  contacts,
}: {
  dealId: string;
  companyId: string;
  currentStageId: string;
  stages: Stage[];
  owners: OwnerOption[];
  contacts: ContactOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingGate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const companyContacts = contacts.filter((c) => c.companyId === companyId);

  async function handleChange(toStageId: string) {
    if (toStageId === currentStageId) return;
    setError(null);
    setBusy(true);

    const result = await postStageTransition(dealId, { toStageId });

    setBusy(false);

    if (result.ok) {
      router.refresh();
      return;
    }

    if (result.status === 422) {
      const stageName = stages.find((s) => s.id === toStageId)?.name ?? "this stage";
      setPending({ toStageId, stageName, missingFields: result.fields ?? { error: [result.error] } });
      return;
    }

    setError(result.error);
  }

  return (
    <>
      <Select value={currentStageId} onValueChange={handleChange} disabled={busy}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {stages.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? <p className="text-destructive mt-1 text-sm">{error}</p> : null}

      {pending ? (
        <StageGateModal
          open
          onOpenChange={(open) => {
            if (!open) setPending(null);
          }}
          dealId={dealId}
          toStageId={pending.toStageId}
          stageName={pending.stageName}
          missingFields={pending.missingFields}
          companyId={companyId}
          owners={owners}
          contacts={companyContacts}
          onMoved={() => {
            setPending(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
