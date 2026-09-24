"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Bulk owner-reassignment action bar for the company list (INV-54). Appears
 * only while `selectedIds` is non-empty (page.tsx-level concern is just
 * rendering this conditionally from companies-table.tsx).
 *
 * No confirmation dialog - reassigning an owner isn't destructive like
 * archiving (INV-53) and is trivially reversible by picking again, so this
 * mutates on select the same way the single-record OwnerControl does.
 */
export function BulkOwnerBar({
  selectedIds,
  owners,
  onDone,
  onClear,
}: {
  selectedIds: string[];
  owners: { id: string; name: string }[];
  /** Called after a successful reassignment - clears selection and refreshes the list. */
  onDone: () => void;
  onClear: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleAssign(ownerId: string) {
    setPending(true);

    const res = await fetch("/api/companies/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedIds, ownerId }),
    });

    setPending(false);

    if (!res.ok) {
      toast.error("Couldn't reassign the selected companies.");
      return;
    }

    const owner = owners.find((o) => o.id === ownerId);
    toast.success(
      `Reassigned ${selectedIds.length} ${selectedIds.length === 1 ? "company" : "companies"}${
        owner ? ` to ${owner.name}` : ""
      }.`,
    );
    onDone();
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5">
      <span className="text-sm font-medium">
        {selectedIds.length} selected
      </span>
      <div className="flex items-center gap-2">
        <Select onValueChange={handleAssign} disabled={pending}>
          <SelectTrigger size="sm" className="w-48">
            <SelectValue placeholder="Assign owner..." />
          </SelectTrigger>
          <SelectContent>
            {owners.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon-sm" aria-label="Clear selection" onClick={onClear} disabled={pending}>
          <XIcon />
        </Button>
      </div>
    </div>
  );
}
