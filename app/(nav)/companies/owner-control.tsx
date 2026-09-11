"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_BASE } from "./entity-paths";
import { UNASSIGNED_OWNER } from "./search-params";

/**
 * Inline owner editor for a Company or Contact detail page (INV-54). Same
 * split and same "changes the field directly, no form" shape as
 * lifecycle-stage-control.tsx - both pages are mine, so the shared control
 * lives here rather than duplicated per entity.
 *
 * "Unassigned" is a real, selectable value (ownerId -> null), matching the
 * existing owner filter on the company list (search-params.ts) which already
 * treats "unassigned" as a first-class filter state - a picker that can set
 * an owner but never clear one would be an inconsistent half of that pair.
 */
export function OwnerControl({
  entityType,
  entityId,
  value,
  owners,
}: {
  entityType: "company" | "contact";
  entityId: string;
  value: string | null;
  owners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState(value);
  const [pending, setPending] = useState(false);

  async function handleChange(next: string) {
    const previous = ownerId;
    const nextOwnerId = next === UNASSIGNED_OWNER ? null : next;
    setOwnerId(nextOwnerId);
    setPending(true);

    const res = await fetch(`${API_BASE[entityType]}/${entityId}/owner`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerId: nextOwnerId }),
    });

    setPending(false);

    if (!res.ok) {
      setOwnerId(previous);
      toast.error("Could not update owner.");
      return;
    }

    // Same reasoning as lifecycle-stage-control.tsx: busts the Router Cache
    // so the list/dashboard work-queue reflect the new owner on navigation.
    router.refresh();
  }

  const current = owners.find((o) => o.id === ownerId);

  return (
    <Select value={ownerId ?? UNASSIGNED_OWNER} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger size="sm" className="w-fit">
        <SelectValue>{current ? current.name : "Unassigned"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_OWNER}>Unassigned</SelectItem>
        {owners.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
