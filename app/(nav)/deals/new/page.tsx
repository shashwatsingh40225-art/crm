import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { DealForm } from "../deal-form";

export const runtime = "nodejs";

/**
 * New deal (INV-27). `?companyId=` pre-selects the company - lets a future
 * "New deal" button on Agent A's company detail page (app/(nav)/companies/**,
 * not mine to add to) link straight in with the company already chosen,
 * without any cross-agent file dependency.
 */
export default async function NewDealPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;

  const [companies, contacts, owners] = await Promise.all([
    // Archived companies aren't a valid home for a new deal (flagged by
    // Agent A; ADR 0003).
    prisma.company.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      select: { id: true, name: true, companyId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="New deal"
        description="Sets its opening stage from the source you pick below."
      />
      <DealForm
        mode="create"
        defaultCompanyId={companyId}
        companies={companies}
        contacts={contacts}
        owners={owners}
      />
    </>
  );
}
