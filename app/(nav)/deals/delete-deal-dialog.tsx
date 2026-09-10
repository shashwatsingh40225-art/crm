"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { currencyFormatter } from "./deals-format";

/**
 * Delete confirmation for a deal (INV-56). Names the deal, its stage and its
 * MRR so the cost of the mistake is visible before it's made. This archives
 * (ADR 0003) rather than deletes - StageEvent history survives untouched -
 * but the deal still disappears from the pipeline immediately, so the copy
 * doesn't soften that part.
 */
export function DeleteDealDialog({
  open,
  onOpenChange,
  dealId,
  dealName,
  stageName,
  proposedMrr,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  dealName: string;
  stageName: string;
  proposedMrr: number | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleConfirm() {
    setError(null);
    setDeleting(true);

    const res = await fetch(`/api/deals/${dealId}`, { method: "DELETE" });

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setDeleting(false);
      setError(json?.error ?? "Could not delete this deal.");
      return;
    }

    router.push("/deals");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this deal?</DialogTitle>
          <DialogDescription>
            This removes <strong>{dealName}</strong> from the pipeline, the board
            and every metric. It&apos;s currently in <strong>{stageName}</strong>
            {proposedMrr !== null ? (
              <>
                {" "}
                with a proposed MRR of{" "}
                <strong>{currencyFormatter.format(proposedMrr)}</strong>
              </>
            ) : null}
            . Its stage history is kept - this isn&apos;t a hard delete, but there
            is no undo in the product.
          </DialogDescription>
        </DialogHeader>

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete deal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
