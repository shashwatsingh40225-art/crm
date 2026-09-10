import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { DealsViewTabs } from "../deals-view-tabs";
import { ageInDays } from "../deals-format";
import { KanbanBoard, type BoardDeal } from "./kanban-board";

export const runtime = "nodejs";

/**
 * Kanban board (INV-29). Columns come from the seeded stages, in position
 * order - never hardcoded (CLAUDE.md section 4). Grouping happens here,
 * server-side; the client component only drags cards between the columns
 * it's handed and calls the gated transition route on drop.
 */
export default async function DealsBoardPage() {
  const [stages, deals, contacts, owners] = await Promise.all([
    prisma.stage.findMany({ orderBy: { position: "asc" } }),
    prisma.deal.findMany({
      include: {
        company: { select: { id: true, name: true } },
        owner: { select: { name: true } },
        stageEvents: { orderBy: { changedAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      select: { id: true, name: true, companyId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const boardDeals: BoardDeal[] = deals.map((d) => ({
    id: d.id,
    name: d.name,
    companyId: d.company.id,
    companyName: d.company.name,
    ownerName: d.owner?.name ?? null,
    proposedMrr: d.proposedMrr ? Number(d.proposedMrr) : null,
    ageInStageDays: ageInDays(d.stageEvents[0]?.changedAt ?? d.createdAt),
    stageId: d.stageId,
  }));

  return (
    <>
      <PageHeader
        title="Deals"
        description="Drag a card to move it. Forward moves that are missing required fields open a form instead."
      />
      <DealsViewTabs />
      <KanbanBoard stages={stages} deals={boardDeals} contacts={contacts} owners={owners} />
    </>
  );
}
