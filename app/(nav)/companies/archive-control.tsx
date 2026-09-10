"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type OpenDeal = { id: string; name: string };

// "company" -> "companies" isn't a plain `+ "s"` - naive pluralization 404s
// the API route.
const API_BASE: Record<"company" | "contact", string> = {
  company: "/api/companies",
  contact: "/api/contacts",
};
const LIST_PATH: Record<"company" | "contact", string> = {
  company: "/companies",
  contact: "/contacts",
};

/**
 * Archive action for a Company or Contact detail page (INV-53). Shared
 * between app/(nav)/companies/[id]/page.tsx and app/(nav)/contacts/[id]/page.tsx
 * - same split as lifecycle-stage-control.tsx, which already lives here for
 * the same reason (both pages are mine).
 *
 * Lives in a dropdown, not a primary button (ticket scope), and never fires
 * without the confirmation dialog - there's no direct "Archive" button to
 * skip it. A Company's confirm can come back 409 with the open deals blocking
 * it; that response replaces the dialog's body in place rather than closing
 * it, so the user sees exactly what to close first.
 */
export function ArchiveControl({
  entityType,
  entityId,
  entityName,
  contactCount,
}: {
  entityType: "company" | "contact";
  entityId: string;
  entityName: string;
  /** Companies only - how many of its contacts will be archived alongside it. */
  contactCount?: number;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [blockingDeals, setBlockingDeals] = useState<OpenDeal[] | null>(null);

  function openDialog() {
    setBlockingDeals(null);
    setDialogOpen(true);
  }

  async function handleArchive() {
    setPending(true);
    const res = await fetch(`${API_BASE[entityType]}/${entityId}`, { method: "DELETE" });
    setPending(false);

    if (res.status === 409) {
      const body = (await res.json().catch(() => null)) as { deals?: OpenDeal[] } | null;
      setBlockingDeals(body?.deals ?? []);
      return;
    }

    if (!res.ok) {
      toast.error(`Couldn't archive this ${entityType}.`);
      return;
    }

    setDialogOpen(false);
    toast.success(`${entityName} archived.`);
    router.push(LIST_PATH[entityType]);
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="More actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => {
              // Let the menu's own close proceed (no preventDefault), but
              // wait a tick before mounting the dialog - opening it in the
              // same frame leaves the menu's portal and the dialog's portal
              // both fighting for pointer events, and the dialog's own
              // buttons stop receiving clicks.
              setTimeout(openDialog, 0);
            }}
          >
            Archive {entityType}...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={(open) => !pending && setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive {entityName}?</DialogTitle>
            {blockingDeals && blockingDeals.length > 0 ? (
              <DialogDescription>
                This company has {blockingDeals.length} open deal
                {blockingDeals.length === 1 ? "" : "s"} and can&apos;t be archived until
                they&apos;re closed or reassigned: {blockingDeals.map((d) => d.name).join(", ")}.
              </DialogDescription>
            ) : (
              <DialogDescription>
                {entityType === "company"
                  ? `This removes it from the company list${
                      contactCount ? ` and archives its ${contactCount} contact${contactCount === 1 ? "" : "s"} along with it` : ""
                    }. Its deals are not affected. The record isn't deleted - it's hidden from everyday views.`
                  : "This removes it from the contact list. The record isn't deleted - it's hidden from everyday views."}
              </DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={pending}>
              Cancel
            </Button>
            {!blockingDeals || blockingDeals.length === 0 ? (
              <Button variant="destructive" onClick={handleArchive} disabled={pending}>
                {pending ? "Archiving..." : `Archive ${entityType}`}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
