"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LifecycleStage } from "@prisma/client";
import { toast } from "sonner";
import { LifecycleBadge } from "@/components/ui/badges";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_BASE } from "./entity-paths";

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  prospect: "Prospect",
  lead: "Lead",
  qualified: "Qualified",
  opportunity: "Opportunity",
  customer: "Customer",
  churned: "Churned",
  disqualified: "Disqualified",
};

/**
 * Inline lifecycle-stage editor for a Company or Contact detail page
 * (INV-21 - D4 made real). Shared between app/(nav)/companies/[id]/page.tsx
 * and app/(nav)/contacts/[id]/page.tsx, both of which I own, so it lives
 * here rather than duplicated per entity.
 *
 * Changes the field directly - no form, no submit button. Updates the badge
 * optimistically so the colour flips the instant you pick a value; reverts
 * and toasts if the PATCH fails. The AuditEvent's before/after values come
 * from the audit extension automatically (lib/audit.ts) - this component
 * only has to make the update call.
 */
export function LifecycleStageControl({
  entityType,
  entityId,
  value,
}: {
  entityType: "company" | "contact";
  entityId: string;
  value: LifecycleStage;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(value);
  const [pending, setPending] = useState(false);

  async function handleChange(next: string) {
    const previous = stage;
    const nextStage = next as LifecycleStage;
    setStage(nextStage);
    setPending(true);

    const res = await fetch(`${API_BASE[entityType]}/${entityId}/lifecycle-stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lifecycleStage: nextStage }),
    });

    setPending(false);

    if (!res.ok) {
      setStage(previous);
      toast.error("Could not update lifecycle stage.");
      return;
    }

    // List views read fresh data on navigation - this busts the Router
    // Cache for the current route so a back-navigation to the list reflects
    // the change (AC: "list view filters reflect the change").
    router.refresh();
  }

  return (
    <Select value={stage} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger size="sm" className="w-fit">
        <SelectValue>
          <LifecycleBadge stage={stage} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LIFECYCLE_LABELS).map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
