"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteDealDialog } from "./delete-deal-dialog";

/**
 * Deal detail page header actions. Delete lives in this dropdown (INV-56),
 * not on the board's kanban cards - a drag-and-drop surface is the wrong
 * place for a destructive action, so this is the only entry point.
 */
export function DealActions({
  dealId,
  dealName,
  stageName,
  proposedMrr,
  isClosed,
}: {
  dealId: string;
  dealName: string;
  stageName: string;
  proposedMrr: number | null;
  isClosed: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {!isClosed ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/deals/${dealId}/edit`}>Edit</Link>
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="Deal actions">
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 /> Delete deal
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteDealDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        dealId={dealId}
        dealName={dealName}
        stageName={stageName}
        proposedMrr={proposedMrr}
      />
    </div>
  );
}
