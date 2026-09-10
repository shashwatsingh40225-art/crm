import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { CompaniesTable, type CompanyRow } from "./companies-table";

export const runtime = "nodejs";

export default async function CompaniesPage() {
  const [companies, owners] = await Promise.all([
    prisma.company.findMany({
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  // N+1 by design at this scale (seed volume: single-digit companies) -
  // simpler and more obviously correct than a raw aggregate query. Revisit if
  // CSV import (INV-23) or a real dataset makes this list slow.
  const rows: CompanyRow[] = await Promise.all(
    companies.map(async (company) => {
      const [openDeals, lastActivity] = await Promise.all([
        prisma.deal.count({ where: { companyId: company.id, outcome: null } }),
        prisma.activity.findFirst({
          where: {
            OR: [
              { companyId: company.id },
              { contact: { companyId: company.id } },
              { deal: { companyId: company.id } },
            ],
          },
          orderBy: { occurredAt: "desc" },
          select: { occurredAt: true },
        }),
      ]);

      return {
        id: company.id,
        name: company.name,
        domain: company.domain,
        industry: company.industry,
        lifecycleStage: company.lifecycleStage,
        owner: company.owner,
        openDeals,
        lastActivityAt: lastActivity?.occurredAt ?? null,
      };
    }),
  );

  return (
    <>
      <PageHeader
        title="Companies"
        description="Outbound-scanned prospects and inbound signups' employers."
        actions={
          <Button asChild size="sm">
            <Link href="/companies/new">
              <PlusIcon />
              New company
            </Link>
          </Button>
        }
      />
      <CompaniesTable data={rows} owners={owners} />
    </>
  );
}
