import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { DetailPanel, DetailField } from "@/components/ui/detail-panel";
import { LifecycleBadge } from "@/components/ui/badges";
import { ActivityTimeline } from "@/components/ui/activity-timeline";

export const runtime = "nodejs";

/**
 * Minimal detail view. INV-19 (Agent A2) owns the full version of this page -
 * this much exists now only so INV-18's "row click opens contact detail" AC
 * has somewhere real to land. See the A1 checkpoint summary.
 */
export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { owner: true, company: true },
  });

  if (!contact) notFound();

  return (
    <>
      <PageHeader title={contact.name} description={contact.title ?? undefined} />

      <DetailPanel title="Contact">
        <DetailField label="Company">
          <Link href={`/companies/${contact.company.id}`} className="hover:underline">
            {contact.company.name}
          </Link>
        </DetailField>
        <DetailField label="Email" value={contact.email} />
        <DetailField label="Phone" value={contact.phone} />
        <DetailField label="Lifecycle">
          <LifecycleBadge stage={contact.lifecycleStage} />
        </DetailField>
        <DetailField label="Owner" value={contact.owner?.name} />
      </DetailPanel>

      <ActivityTimeline entityType="contact" entityId={contact.id} />
    </>
  );
}
