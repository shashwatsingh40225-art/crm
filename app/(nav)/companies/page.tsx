import { Building2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const runtime = "nodejs";

/**
 * PLACEHOLDER (INV-9). Agent A replaces this in INV-15.
 * Owned path after the fork: app/(nav)/companies/**
 */
export default function CompaniesPage() {
  return (
    <>
      <PageHeader
        title="Companies"
        description="Outbound-scanned prospects and inbound signups' employers."
      />
      <EmptyState
        icon={Building2}
        title="Companies list not built yet"
        description="INV-15 — Agent A · Records."
      />
    </>
  );
}
