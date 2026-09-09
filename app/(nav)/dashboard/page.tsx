import { LayoutDashboard } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * PLACEHOLDER (INV-9). Agent C replaces this with the funnel dashboard in
 * INV-38 to INV-41. The funnel is a MUST and is the artifact the brief names
 * directly - it is never cut (CLAUDE.md section 2).
 */
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Signed in as ${user.name}.`}
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Funnel dashboard not built yet"
        description="INV-38 to INV-41 — Agent C · Activity & Dashboard. One chain from first scan to signed engagement."
      />
    </>
  );
}
