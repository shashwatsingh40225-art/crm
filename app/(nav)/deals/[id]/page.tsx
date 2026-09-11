import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { DetailPanel, DetailField } from "@/components/ui/detail-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageBadge, SourceBadge, PlanTierBadge, OutcomeBadge } from "@/components/ui/badges";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { NextActionEditor } from "../next-action-editor";
import { StagePicker } from "../stage-picker";
import { ClosedBanner } from "../closed-banner";
import { DealActions } from "../deal-actions";
import { StageHistoryTimeline } from "../stage-history-timeline";
import { currencyFormatter, dateFormatter } from "../deals-format";

export const runtime = "nodejs";

/**
 * Deal detail (INV-26, plus INV-28's "detail-page change"). Company and
 * contact are links out to Agent A's pages (cross-agent read via the shared
 * Prisma client, ADR 0002 - not a call to their API routes). Stage history
 * renders every StageEvent newest first, with actor and timestamp (INV-28).
 * Stage itself is a picker, not a badge - selecting a new one calls the same
 * gated transition route the board uses (INV-29/30). Tasks is a read-only
 * list - Agent C owns Task mutations and the Tasks section itself.
 *
 * INV-31: a closed deal (stage key `closed`) is read-only - no Edit button,
 * no stage picker (a static badge instead), next action isn't editable -
 * except for the banner's Reopen action, which returns it to the stage it
 * was in right before closing.
 */
export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Archived deals aren't findUnique-able by a plain where without dropping
  // to findFirst - excluded so a deleted deal's URL 404s (INV-56 / ADR 0003).
  const deal = await prisma.deal.findFirst({
    where: { id, archivedAt: null },
    include: {
      company: { select: { id: true, name: true } },
      primaryContact: { select: { id: true, name: true } },
      stage: true,
      owner: { select: { name: true } },
    },
  });

  if (!deal) notFound();

  const [stageEvents, tasks, stages, owners, contacts] = await Promise.all([
    prisma.stageEvent.findMany({
      where: { dealId: deal.id },
      // Ascending - the timeline (INV-57) reads top to bottom as it
      // happened. priorStageId below reads the *last* element accordingly.
      orderBy: { changedAt: "asc" },
      include: {
        fromStage: true,
        toStage: true,
        changedBy: { select: { name: true } },
      },
    }),
    prisma.task.findMany({
      where: { dealId: deal.id },
      orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }],
    }),
    prisma.stage.findMany({ orderBy: { position: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.contact.findMany({
      select: { id: true, name: true, companyId: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const isOverdue =
    !deal.outcome &&
    deal.nextActionDue !== null &&
    deal.nextActionDue.getTime() < Date.now();

  const isClosed = deal.stage.key === "closed";
  // stageEvents is chronological (oldest first), so the last element is the
  // transition that closed this deal (if it's closed) - its fromStageId is
  // where reopen returns to. Falls back to Scanned only if that's somehow
  // missing.
  const priorStageId =
    (isClosed ? stageEvents[stageEvents.length - 1]?.fromStageId : null) ??
    stages.find((s) => s.key === "scanned")?.id ??
    stages[0].id;

  return (
    <>
      <PageHeader
        title={deal.name}
        description={deal.company.name}
        actions={
          <DealActions
            dealId={deal.id}
            dealName={deal.name}
            stageName={deal.stage.name}
            proposedMrr={deal.proposedMrr ? Number(deal.proposedMrr) : null}
            isClosed={isClosed}
          />
        }
      />

      {isClosed && deal.outcome ? (
        <ClosedBanner
          dealId={deal.id}
          outcome={deal.outcome}
          lostReason={deal.lostReason}
          priorStageId={priorStageId}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <DetailPanel title="Deal">
            <DetailField label="Company">
              <Link
                href={`/companies/${deal.company.id}`}
                className="text-primary hover:underline"
              >
                {deal.company.name}
              </Link>
            </DetailField>
            <DetailField label="Primary contact">
              {deal.primaryContact ? (
                <Link
                  href={`/contacts/${deal.primaryContact.id}`}
                  className="text-primary hover:underline"
                >
                  {deal.primaryContact.name}
                </Link>
              ) : null}
            </DetailField>
            <DetailField label="Stage">
              {isClosed ? (
                <StageBadge stage={deal.stage.key} label={deal.stage.name} />
              ) : (
                <StagePicker
                  dealId={deal.id}
                  companyId={deal.company.id}
                  currentStageId={deal.stageId}
                  stages={stages}
                  owners={owners}
                  contacts={contacts}
                />
              )}
            </DetailField>
            <DetailField label="Source">
              <SourceBadge source={deal.source} />
            </DetailField>
            <DetailField label="Owner" value={deal.owner?.name ?? null} />
            <DetailField label="Proposed tier">
              {deal.proposedTier ? <PlanTierBadge tier={deal.proposedTier} /> : null}
            </DetailField>
            <DetailField
              label="Proposed MRR"
              value={
                deal.proposedMrr ? currencyFormatter.format(Number(deal.proposedMrr)) : null
              }
            />
            {deal.outcome ? (
              <DetailField label="Outcome">
                <OutcomeBadge outcome={deal.outcome} />
              </DetailField>
            ) : null}
            {deal.outcome === "lost" ? (
              <DetailField label="Lost reason" value={deal.lostReason} />
            ) : null}
          </DetailPanel>

          <ActivityTimeline entityType="deal" entityId={deal.id} />
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Next action</CardTitle>
            </CardHeader>
            <CardContent>
              <NextActionEditor
                dealId={deal.id}
                nextAction={deal.nextAction}
                nextActionDue={deal.nextActionDue ? deal.nextActionDue.toISOString() : null}
                isOverdue={isOverdue}
                disabled={isClosed}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stage history</CardTitle>
            </CardHeader>
            <CardContent>
              <StageHistoryTimeline events={stageEvents} currentStageName={deal.stage.name} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No tasks linked to this deal.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span
                        className={
                          t.completedAt ? "text-muted-foreground line-through" : ""
                        }
                      >
                        {t.title}
                      </span>
                      {t.dueDate ? (
                        <span className="text-muted-foreground text-xs">
                          {dateFormatter.format(t.dueDate)}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
