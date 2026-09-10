import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { CsvImporter } from "./csv-importer";

export const runtime = "nodejs";

export default async function ImportCompaniesPage() {
  const existingCompanies = await prisma.company.findMany({
    select: { id: true, name: true, domain: true },
  });

  return (
    <>
      <PageHeader
        title="Import companies"
        description="Bulk-load prospects from a CSV. Rows that fail validation are reported, not dropped."
      />
      <CsvImporter existingCompanies={existingCompanies} />
    </>
  );
}
