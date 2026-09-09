import { CheckSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const runtime = "nodejs";

/**
 * PLACEHOLDER (INV-9). Agent C replaces this in INV-35.
 * Owned path after the fork: app/(nav)/tasks/**
 */
export default function TasksPage() {
  return (
    <>
      <PageHeader title="Tasks" description="What needs a human today." />
      <EmptyState
        icon={CheckSquare}
        title="Task list not built yet"
        description="INV-35 — Agent C · Activity & Dashboard."
      />
    </>
  );
}
