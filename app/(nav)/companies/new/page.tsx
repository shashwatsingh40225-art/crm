import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyForm } from "../company-form";

export const runtime = "nodejs";

export default async function NewCompanyPage() {
  const [owners, existingCompanies] = await Promise.all([
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.company.findMany({ select: { id: true, name: true, domain: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="New company"
        description="Add a prospect or signup's employer to the pipeline."
      />
      <CompanyForm owners={owners} existingCompanies={existingCompanies} />
    </>
  );
}
