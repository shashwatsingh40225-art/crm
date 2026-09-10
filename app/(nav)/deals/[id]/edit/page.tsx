import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { DealForm } from "../../deal-form";

export const runtime = "nodejs";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [deal, companies, contacts, owners] = await Promise.all([
    prisma.deal.findUnique({ where: { id } }),
    prisma.company.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.contact.findMany({
      select: { id: true, name: true, companyId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!deal) notFound();

  return (
    <>
      <PageHeader title={`Edit — ${deal.name}`} />
      <DealForm
        mode="edit"
        deal={{
          id: deal.id,
          name: deal.name,
          companyId: deal.companyId,
          primaryContactId: deal.primaryContactId,
          source: deal.source,
          ownerId: deal.ownerId,
          proposedTier: deal.proposedTier,
          proposedMrr: deal.proposedMrr ? Number(deal.proposedMrr) : null,
          nextAction: deal.nextAction,
          nextActionDue: deal.nextActionDue ? deal.nextActionDue.toISOString() : null,
        }}
        companies={companies}
        contacts={contacts}
        owners={owners}
      />
    </>
  );
}
