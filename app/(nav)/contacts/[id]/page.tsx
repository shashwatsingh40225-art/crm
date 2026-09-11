import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DetailField } from "@/components/ui/detail-panel";
import { ActivityTimeline } from "@/components/ui/activity-timeline";
import { LifecycleStageControl } from "../../companies/lifecycle-stage-control";
import { ArchiveControl } from "../../companies/archive-control";
import { OwnerControl } from "../../companies/owner-control";
import {
  DealsPanel,
  TasksPanel,
  type RelatedDeal,
} from "../../companies/related-panels";

export const runtime = "nodejs";



export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { company: true },
  });

  if (!contact || contact.archivedAt) notFound();

  // Only deals this contact is PRIMARY on - not every deal at their company.
  // Deals and Tasks are read through the shared client (ADR 0002).
  const [deals, tasks, owners] = await Promise.all([
    prisma.deal.findMany({
      where: { primaryContactId: id },
      include: { stage: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { contactId: id, completedAt: null },
      include: { owner: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

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
        title={contact.name}
        description={contact.title ?? undefined}
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link href={`/contacts/${contact.id}/edit`}>Edit</Link>
            </Button>
            <ArchiveControl
              entityType="contact"
              entityId={contact.id}
              entityName={contact.name}
            />
          </>
        }
      />

      <Card>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-5">
            <DetailField label="Company">
              <Link
                href={`/companies/${contact.company.id}`}
                className="hover:underline"
              >
                {contact.company.name}
              </Link>
            </DetailField>

            <DetailField label="Email">
              {contact.email ? (
                <a href={`mailto:${contact.email}`} className="hover:underline">
                  {contact.email}
                </a>
              ) : null}
            </DetailField>

            <DetailField label="Phone" value={contact.phone} />

            <DetailField label="Lifecycle">
              <LifecycleStageControl
                entityType="contact"
                entityId={contact.id}
                value={contact.lifecycleStage}
              />
            </DetailField>

            <DetailField label="Owner">
              <OwnerControl
                entityType="contact"
                entityId={contact.id}
                value={contact.ownerId}
                owners={owners}
              />
            </DetailField>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ActivityTimeline entityType="contact" entityId={contact.id} />
        </div>

        <div className="grid gap-6">
          <DealsPanel
            deals={relatedDeals}
            emptyTitle="Not the primary contact on any deal"
          />
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
