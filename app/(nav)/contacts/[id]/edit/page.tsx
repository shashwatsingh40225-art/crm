import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { ContactForm } from "../../contact-form";

export const runtime = "nodejs";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contact, companies, owners] = await Promise.all([
    prisma.contact.findUnique({ where: { id } }),
    prisma.company.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, domain: true },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!contact || contact.archivedAt) notFound();

  return (
    <>
      <PageHeader title={`Edit ${contact.name}`} />
      <ContactForm
        contactId={contact.id}
        companies={companies}
        owners={owners}
        defaultValues={{
          name: contact.name,
          email: contact.email ?? "",
          title: contact.title ?? "",
          phone: contact.phone ?? "",
          companyId: contact.companyId,
          lifecycleStage: contact.lifecycleStage,
          ownerId: contact.ownerId ?? "",
        }}
      />
    </>
  );
}
