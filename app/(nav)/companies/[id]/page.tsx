import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { DetailPanel, DetailField } from "@/components/ui/detail-panel";
import { LifecycleBadge, SourceBadge, IcpFitBadge } from "@/components/ui/badges";
import { ActivityTimeline } from "@/components/ui/activity-timeline";

export const runtime = "nodejs";

const SIZE_LABELS: Record<string, string> = {
  size_1_10: "1–10",
  size_11_50: "11–50",
  size_51_200: "51–200",
  size_201_1000: "201–1,000",
  size_1000_plus: "1,000+",
};

/**
 * Minimal detail view. INV-16 (Agent A2) owns the full version of this page -
 * this much exists now only so INV-17's "save redirects to detail" AC has
 * somewhere real to land. See the A1 checkpoint summary.
 */
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

  if (!company) notFound();

  return (
    <>
      <PageHeader
        title={company.name}
        description={company.domain ?? undefined}
        actions={
          <Button asChild size="sm" variant="outline">
            <Link href={`/companies/${company.id}/edit`}>Edit</Link>
          </Button>
        }
      />

      <DetailPanel title="Company">
        <DetailField label="Domain" value={company.domain} />
        <DetailField label="Industry" value={company.industry} />
        <DetailField label="Size" value={company.size ? SIZE_LABELS[company.size] : null} />
        <DetailField label="Source">
          <SourceBadge source={company.source} />
        </DetailField>
        <DetailField label="Lifecycle">
          <LifecycleBadge stage={company.lifecycleStage} />
        </DetailField>
        <DetailField label="ICP fit">
          {company.icpFit ? <IcpFitBadge fit={company.icpFit} /> : null}
        </DetailField>
        <DetailField label="Owner" value={company.owner?.name} />
        <DetailField
          label="Created"
          value={format(company.createdAt, "MMM d, yyyy")}
        />
      </DetailPanel>

      <ActivityTimeline entityType="company" entityId={company.id} />
    </>
  );
}
