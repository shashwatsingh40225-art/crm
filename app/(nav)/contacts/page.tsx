import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { ContactsTable, type ContactRow } from "./contacts-table";

export const runtime = "nodejs";

export default async function ContactsPage() {
  const contacts = await prisma.contact.findMany({
    include: {
      owner: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  const rows: ContactRow[] = await Promise.all(
    contacts.map(async (contact) => {
      const lastActivity = await prisma.activity.findFirst({
        where: { contactId: contact.id },
        orderBy: { occurredAt: "desc" },
        select: { occurredAt: true },
      });

      return {
        id: contact.id,
        name: contact.name,
        title: contact.title,
        email: contact.email,
        lifecycleStage: contact.lifecycleStage,
        owner: contact.owner,
        company: contact.company,
        lastActivityAt: lastActivity?.occurredAt ?? null,
      };
    }),
  );

  return (
    <>
      <PageHeader
        title="Contacts"
        description="People at the companies in the pipeline."
      />
      <ContactsTable data={rows} />
    </>
  );
}
