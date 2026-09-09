import { Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const runtime = "nodejs";

/**
 * PLACEHOLDER (INV-9). Agent A replaces this in INV-17.
 * Owned path after the fork: app/(nav)/contacts/**
 */
export default function ContactsPage() {
  return (
    <>
      <PageHeader
        title="Contacts"
        description="People at the companies in the pipeline."
      />
      <EmptyState
        icon={Users}
        title="Contacts list not built yet"
        description="INV-17 — Agent A · Records."
      />
    </>
  );
}
