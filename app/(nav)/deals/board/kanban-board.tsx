"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Stage } from "@prisma/client";
import { cn } from "@/lib/utils";
import type { ContactOption, OwnerOption } from "../deal-form";
import { currencyFormatter } from "../deals-format";
import { postStageTransition } from "../stage-transition";
import { StageGateModal } from "../stage-gate-modal";

export type BoardDeal = {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
  ownerName: string | null;
  proposedMrr: number | null;
  ageInStageDays: number;
  stageId: string;
};

type PendingGate = {
  dealId: string;
  toStageId: string;
  stageName: string;
  companyId: string;
  missingFields: Record<string, string[]>;
};

const STALE_DAYS = 7;

function groupByStage(deals: BoardDeal[]): Record<string, BoardDeal[]> {
  const groups: Record<string, BoardDeal[]> = {};
  for (const d of deals) {
    (groups[d.stageId] ??= []).push(d);
  }
  return groups;
}

export function KanbanBoard({
  stages,
  deals,
  contacts,
  owners,
}: {
  stages: Stage[];
  deals: BoardDeal[];
  contacts: ContactOption[];
  owners: OwnerOption[];
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Record<string, BoardDeal[]>>(groupByStage(deals));
  const [pendingGate, setPendingGate] = useState<PendingGate | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // moveDealLocally() moves the card immediately using the pre-move field
  // values it already has (correct stage, correct age reset to 0d - but any
  // gate fields just filled in the modal, e.g. owner, aren't in that stale
  // object). router.refresh() re-fetches the server data in the background;
  // once it lands, `deals` is a new array and this resyncs `columns` to the
  // authoritative values so the transient staleness self-corrects.
  useEffect(() => {
    setColumns(groupByStage(deals));
  }, [deals]);

  function findDeal(dealId: string): BoardDeal | undefined {
    for (const list of Object.values(columns)) {
      const found = list.find((d) => d.id === dealId);
      if (found) return found;
    }
    return undefined;
  }

  function moveDealLocally(dealId: string, toStageId: string) {
    const dealToMove = findDeal(dealId);
    setColumns((prev) => {
      const next: Record<string, BoardDeal[]> = {};
      for (const [stageId, list] of Object.entries(prev)) {
        next[stageId] = list.filter((d) => d.id !== dealId);
      }
      if (dealToMove) {
        next[toStageId] = [
          ...(next[toStageId] ?? []),
          { ...dealToMove, stageId: toStageId, ageInStageDays: 0 },
        ];
      }
      return next;
    });
    router.refresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    setBoardError(null);
    const dealId = String(event.active.id);
    const overStageId = event.over ? String(event.over.id) : null;
    if (!overStageId) return;

    const deal = findDeal(dealId);
    if (!deal || deal.stageId === overStageId) return;

    const sourceStage = stages.find((s) => s.id === deal.stageId);
    const targetStage = stages.find((s) => s.id === overStageId);
    if (!sourceStage || !targetStage) return;

    const result = await postStageTransition(dealId, { toStageId: overStageId });

    if (result.ok) {
      moveDealLocally(dealId, overStageId);
      return;
    }

    if (result.status === 422) {
      setPendingGate({
        dealId,
        toStageId: overStageId,
        stageName: targetStage.name,
        companyId: deal.companyId,
        missingFields: result.fields ?? { error: [result.error] },
      });
      return;
    }

    setBoardError(result.error);
  }

  const gateContacts = pendingGate
    ? contacts.filter((c) => c.companyId === pendingGate.companyId)
    : [];

  return (
    <div className="grid gap-3">
      {boardError ? <p className="text-destructive text-sm">{boardError}</p> : null}

      <DndContext id="deals-board-dnd" sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <Column
              key={stage.id}
              stage={stage}
              deals={columns[stage.id] ?? []}
            />
          ))}
        </div>
      </DndContext>

      {pendingGate ? (
        <StageGateModal
          open
          onOpenChange={(open) => {
            if (!open) setPendingGate(null);
          }}
          dealId={pendingGate.dealId}
          toStageId={pendingGate.toStageId}
          stageName={pendingGate.stageName}
          missingFields={pendingGate.missingFields}
          companyId={pendingGate.companyId}
          owners={owners}
          contacts={gateContacts}
          onMoved={() => {
            moveDealLocally(pendingGate.dealId, pendingGate.toStageId);
            setPendingGate(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Column({ stage, deals }: { stage: Stage; deals: BoardDeal[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const mrrTotal = deals.reduce((sum, d) => sum + (d.proposedMrr ?? 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid w-64 shrink-0 auto-rows-min gap-2 rounded-lg border p-2 transition-colors",
        isOver && "border-primary bg-muted/40",
      )}
    >
      <div className="grid gap-0.5 px-1 pt-1">
        <span className="text-sm font-medium">{stage.name}</span>
        <span className="text-muted-foreground text-xs">
          {deals.length} {deals.length === 1 ? "deal" : "deals"}
          {mrrTotal > 0 ? ` · ${currencyFormatter.format(mrrTotal)}` : ""}
        </span>
      </div>

      <div className="grid min-h-16 gap-2">
        {deals.map((deal) => (
          <Card key={deal.id} deal={deal} />
        ))}
      </div>
    </div>
  );
}

function Card({ deal }: { deal: BoardDeal }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
  });
  const isStale = deal.ageInStageDays > STALE_DAYS;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn(
        "grid cursor-grab gap-1 rounded-lg border bg-card p-2.5 text-sm shadow-sm active:cursor-grabbing",
        isStale && "border-amber-400 dark:border-amber-600",
      )}
    >
      <span className="font-medium">{deal.name}</span>
      <span className="text-muted-foreground text-xs">{deal.companyName}</span>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{deal.ownerName ?? "Unassigned"}</span>
        {deal.proposedMrr ? (
          <span className="font-medium">{currencyFormatter.format(deal.proposedMrr)}</span>
        ) : null}
      </div>
      <span
        className={cn(
          "text-xs",
          isStale ? "font-medium text-amber-700 dark:text-amber-500" : "text-muted-foreground",
        )}
      >
        {deal.ageInStageDays}d in stage{isStale ? " · stale" : ""}
      </span>
    </div>
  );
}
