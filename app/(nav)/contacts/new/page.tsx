import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { ContactForm } from "../contact-form";

export const runtime = "nodejs";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  const { companyId } = await searchParams;

  const [companies, owners, lockedCompany] = await Promise.all([
    prisma.company.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, domain: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    companyId
      ? prisma.company.findFirst({
          where: { id: companyId, archivedAt: null },
          select: { id: true, name: true, domain: true },
        })
      : null,
  ]);

  return (
    <>
      <PageHeader
        title="New contact"
        description={
          lockedCompany ? `Adding a contact at ${lockedCompany.name}.` : undefined
        }
      />
      <ContactForm
        companies={companies}
        owners={owners}
        lockedCompany={lockedCompany ?? undefined}
      />
    </>
  );
}
