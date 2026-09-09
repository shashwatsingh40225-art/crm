import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { DetailPanel, DetailField } from "@/components/ui/detail-panel";
import { StageBadge, SourceBadge } from "@/components/ui/badges";
import { ActivityTimeline } from "@/components/ui/activity-timeline";

export const runtime = "nodejs";

/**
 * Thin deal detail (INV-25's "row click opens deal detail" criterion needs a
 * real route to land on). Full detail/edit UI - inline editing, activity log,
 * tasks - is INV-26, the next slice. This intentionally shows only the fields
 * already on the list row plus primary contact, not a preview of INV-26.
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
      company: { select: { name: true } },
      primaryContact: { select: { name: true } },
      stage: true,
      owner: { select: { name: true } },
    },
  });

  if (!deal) notFound();

  return (
    <>
      <PageHeader title={deal.name} description={deal.company.name} />
      <DetailPanel title="Deal">
        <DetailField label="Stage">
          <StageBadge stage={deal.stage.key} label={deal.stage.name} />
        </DetailField>
        <DetailField label="Source">
          <SourceBadge source={deal.source} />
        </DetailField>
        <DetailField label="Owner" value={deal.owner?.name ?? null} />
        <DetailField
          label="Primary contact"
          value={deal.primaryContact?.name ?? null}
        />
      </DetailPanel>
      <ActivityTimeline entityType="deal" entityId={deal.id} />
    </>
  );
}
