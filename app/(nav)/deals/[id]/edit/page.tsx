import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { DealForm } from "../../deal-form";

export const runtime = "nodejs";

export default async function EditDealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Excludes archived deals so an archived deal's edit URL 404s too
  // (INV-56 / ADR 0003), same as the detail page. Fetched before the
  // Promise.all below because the company list needs deal.companyId.
  const deal = await prisma.deal.findFirst({
    where: { id, archivedAt: null },
    include: { stage: true },
  });

  if (!deal) notFound();

  const [companies, contacts, owners] = await Promise.all([
    // Archived companies aren't a valid new home for a deal (same gap
    // Agent A flagged for new/page.tsx) - except the deal's own current
    // company stays selectable even if it's since been archived, or the
    // combobox would silently show no selection for an already-valid,
    // already-saved company.
    prisma.company.findMany({
      where: { OR: [{ archivedAt: null }, { id: deal.companyId }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.findMany({
      select: { id: true, name: true, companyId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  // INV-31: closed deals are read-only except for reopen, which lives on
  // the detail page's banner, not here. Guards the PATCH route too - this
  // is belt-and-suspenders so the form doesn't dead-end on submit.
  if (deal.stage.key === "closed") {
    return (
      <>
        <PageHeader title={`Edit — ${deal.name}`} />
        <EmptyState
          icon={Lock}
          title="This deal is closed"
          description="Reopen it from the deal page before editing."
          action={
            <Button asChild size="sm">
              <Link href={`/deals/${deal.id}`}>Go to deal</Link>
            </Button>
          }
        />
      </>
    );
  }

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
