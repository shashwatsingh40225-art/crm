import { Users } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ContactsFilters } from "./contacts-filters";
import { ContactsTable, type ContactRow } from "./contacts-table";
import { PaginationControls } from "./pagination-controls";
import { loadContactsSearchParams, PAGE_SIZE } from "./search-params";
import type { SearchParams } from "nuqs/server";

export const runtime = "nodejs";

/**
 * Contact list (INV-52). Same split as `app/(nav)/companies/page.tsx`: URL
 * search params (nuqs) drive the Prisma `where`/`skip`/`take` here, and
 * contacts-table.tsx is now purely presentational.
 *
 * The old per-row N+1 (one `activity.findFirst` per contact) is replaced with
 * a single `activity.groupBy` on `contactId` for the page's contacts -
 * `contactId` is a direct column here (unlike the company case), so a real
 * groupBy covers it without any relation-spanning OR.
 */
export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, stage, company, page } = await loadContactsSearchParams(searchParams);

  const where: Prisma.ContactWhereInput = { archivedAt: null };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (stage) where.lifecycleStage = stage;
  if (company) where.companyId = company;

  const hasFilters = Boolean(q || stage || company);

  const [total, contacts, companies] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.company.findMany({
      where: { archivedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const contactIds = contacts.map((c) => c.id);

  const lastActivities = await prisma.activity.groupBy({
    by: ["contactId"],
    where: { contactId: { in: contactIds } },
    _max: { occurredAt: true },
  });
  const lastActivityByContact = new Map(
    lastActivities.map((a) => [a.contactId, a._max.occurredAt]),
  );

  const rows: ContactRow[] = contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    title: contact.title,
    email: contact.email,
    lifecycleStage: contact.lifecycleStage,
    owner: contact.owner,
    company: contact.company,
    lastActivityAt: lastActivityByContact.get(contact.id) ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Contacts"
        description="People at the companies in the pipeline."
      />
      <div className="grid gap-4">
        <ContactsFilters companies={companies} />
        <ContactsTable
          data={rows}
          emptyState={
            <EmptyState
              icon={Users}
              title={hasFilters ? "No contacts match these filters" : "No contacts yet"}
              description={
                hasFilters
                  ? "Try a different search term or clear the filters."
                  : "Contacts appear here once they're added to a company."
              }
            />
          }
        />
        <PaginationControls total={total} page={page} />
      </div>
    </>
  );
}
