import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { CompanyForm } from "../../company-form";

export const runtime = "nodejs";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [company, owners] = await Promise.all([
    prisma.company.findUnique({ where: { id } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!company) notFound();

  return (
    <>
      <PageHeader title={`Edit ${company.name}`} />
      <CompanyForm
        companyId={company.id}
        owners={owners}
        defaultValues={{
          name: company.name,
          domain: company.domain ?? "",
          industry: company.industry ?? "",
          size: company.size ?? undefined,
          source: company.source,
          lifecycleStage: company.lifecycleStage,
          ownerId: company.ownerId ?? "",
        }}
      />
    </>
  );
}
