import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { DetailPanel, DetailField } from "@/components/ui/detail-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SourceBadge, PlanTierBadge, OutcomeBadge } from "@/components/ui/badges";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { NextActionEditor } from "../next-action-editor";
import { StagePicker } from "../stage-picker";
import { currencyFormatter, dateFormatter, dateTimeFormatter } from "../deals-format";

export const runtime = "nodejs";

/**
 * Deal detail (INV-26, plus INV-28's "detail-page change"). Company and
 * contact are links out to Agent A's pages (cross-agent read via the shared
 * Prisma client, ADR 0002 - not a call to their API routes). Stage history
 * renders every StageEvent newest first, with actor and timestamp (INV-28).
 * Stage itself is a picker, not a badge - selecting a new one calls the same
 * gated transition route the board uses (INV-29/30). Tasks is a read-only
 * list - Agent C owns Task mutations and the Tasks section itself.
 */
export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const deal = await prisma.deal.findUnique({
    where: { id },
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
      orderBy: { changedAt: "desc" },
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

  return (
    <>
      <PageHeader
        title={deal.name}
        description={deal.company.name}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/deals/${deal.id}/edit`}>Edit</Link>
          </Button>
        }
      />

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
              <StagePicker
                dealId={deal.id}
                companyId={deal.company.id}
                currentStageId={deal.stageId}
                stages={stages}
                owners={owners}
                contacts={contacts}
              />
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
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stage history</CardTitle>
            </CardHeader>
            <CardContent>
              {stageEvents.length === 0 ? (
                <p className="text-muted-foreground text-sm">No transitions yet.</p>
              ) : (
                <ol className="grid gap-3">
                  {stageEvents.map((e) => (
                    <li key={e.id} className="grid gap-0.5 text-sm">
                      <span>
                        {e.fromStage ? e.fromStage.name : "Entered pipeline"} →{" "}
                        <span className="font-medium">{e.toStage.name}</span>
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {dateTimeFormatter.format(e.changedAt)} ·{" "}
                        {e.changedBy?.name ?? "Unknown"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
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
