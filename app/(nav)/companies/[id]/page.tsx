import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DetailPanel, DetailField } from "@/components/ui/detail-panel";
import { SourceBadge, IcpFitBadge } from "@/components/ui/badges";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { LifecycleStageControl } from "../lifecycle-stage-control";
import { ArchiveControl } from "../archive-control";
import {
  ContactsPanel,
  DealsPanel,
  TasksPanel,
  type RelatedDeal,
} from "../related-panels";

export const runtime = "nodejs";

const SIZE_LABELS: Record<string, string> = {
  size_1_10: "1–10",
  size_11_50: "11–50",
  size_51_200: "51–200",
  size_201_1000: "201–1,000",
  size_1000_plus: "1,000+",
};

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: { owner: true },
  });

  if (!company || company.archivedAt) notFound();

  // Deals and Tasks belong to Agents B and C. Read through the shared client,
  // never through their API routes (ADR 0002 / CLAUDE.md section 9).
  const [contacts, deals, tasks, lastActivity] = await Promise.all([
    prisma.contact.findMany({
      where: { companyId: id, archivedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.deal.findMany({
      where: { companyId: id },
      include: { stage: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { companyId: id, completedAt: null },
      include: { owner: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.activity.findFirst({
      where: {
        OR: [
          { companyId: id },
          { contact: { companyId: id } },
          { deal: { companyId: id } },
        ],
      },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true, subject: true },
    }),
  ]);

  const openDeals = deals.filter((deal) => !deal.outcome);

  // "What happens next" for the account is the soonest-due next action across
  // its open deals. Undated actions sort last rather than being dropped.
  const nextActionDeal =
    openDeals
      .filter((deal) => deal.nextAction)
      .sort((a, b) => {
        if (!a.nextActionDue) return 1;
        if (!b.nextActionDue) return -1;
        return a.nextActionDue.getTime() - b.nextActionDue.getTime();
      })[0] ?? null;

  const relatedDeals: RelatedDeal[] = deals.map((deal) => ({
    id: deal.id,
    name: deal.name,
    stageKey: deal.stage.key,
    stageName: deal.stage.name,
    proposedMrr: deal.proposedMrr ? Number(deal.proposedMrr) : null,
    outcome: deal.outcome,
  }));

  return (
    <>
      <PageHeader
        title={company.name}
        description={company.domain ?? undefined}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/contacts/new?companyId=${company.id}`}>New contact</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/companies/${company.id}/edit`}>Edit</Link>
            </Button>
            <ArchiveControl
              entityType="company"
              entityId={company.id}
              entityName={company.name}
              contactCount={contacts.length}
            />
          </>
        }
      />

      {/*
        The five questions the ticket names, answered in one strip so none of
        them needs a scroll: who is this (name/domain above), what is
        happening (open deals), who owns it (owner), what happened recently
        (last activity), what happens next (next action).
      */}
      <Card>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
            <DetailField label="Lifecycle">
              <LifecycleStageControl
                entityType="company"
                entityId={company.id}
                value={company.lifecycleStage}
              />
            </DetailField>

            <DetailField label="Owner">
              {company.owner ? company.owner.name : <Dash />}
            </DetailField>

            <DetailField label="Open deals">
              {openDeals.length === 0 ? (
                <Dash />
              ) : (
                <span>
                  {openDeals.length}
                  <span className="text-muted-foreground">
                    {" · "}
                    {openDeals.length === 1
                      ? openDeals[0].stage.name
                      : `${deals.length} total`}
                  </span>
                </span>
              )}
            </DetailField>

            <DetailField label="Next action">
              {nextActionDeal ? (
                <div className="grid gap-0.5">
                  <span>{nextActionDeal.nextAction}</span>
                  <Link
                    href={`/deals/${nextActionDeal.id}`}
                    className="text-muted-foreground text-xs hover:underline"
                  >
                    {nextActionDeal.name}
                    {nextActionDeal.nextActionDue
                      ? ` · due ${format(nextActionDeal.nextActionDue, "MMM d")}`
                      : ""}
                  </Link>
                </div>
              ) : (
                <Dash />
              )}
            </DetailField>

            <DetailField label="Last activity">
              {lastActivity ? (
                <div className="grid gap-0.5">
                  <span>{format(lastActivity.occurredAt, "MMM d, yyyy")}</span>
                  <span className="text-muted-foreground text-xs">
                    {lastActivity.subject}
                  </span>
                </div>
              ) : (
                <Dash />
              )}
            </DetailField>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-2">
          <DetailPanel title="Overview">
            <DetailField label="Domain" value={company.domain} />
            <DetailField label="Industry" value={company.industry} />
            <DetailField
              label="Size"
              value={company.size ? SIZE_LABELS[company.size] : null}
            />
            <DetailField label="Source">
              <SourceBadge source={company.source} />
            </DetailField>
            <DetailField label="ICP fit">
              {company.icpFit ? <IcpFitBadge fit={company.icpFit} /> : <Dash />}
            </DetailField>
            <DetailField
              label="Created"
              value={format(company.createdAt, "MMM d, yyyy")}
            />
          </DetailPanel>

          <ActivityTimeline entityType="company" entityId={company.id} />
        </div>

        <div className="grid gap-6">
          <ContactsPanel contacts={contacts} />
          <DealsPanel deals={relatedDeals} />
          <TasksPanel
            tasks={tasks.map((task) => ({
              id: task.id,
              title: task.title,
              dueDate: task.dueDate,
              ownerName: task.owner?.name ?? null,
            }))}
          />
        </div>
      </div>
    </>
  );
}
