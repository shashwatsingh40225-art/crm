import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * STUB (INV-13). Agent C replaces the body in INV-34; the props signature below
 * is final and must not change - Agents A and B already render this on their
 * detail pages, so a signature change breaks two agents at merge.
 *
 * Agent C's implementation reads Activity rows for the given entity through the
 * shared Prisma client, newest first, and renders type, subject, actor and
 * occurredAt.
 */
export type ActivityTimelineProps = {
  /** Which record's activity to show. */
  entityType: "company" | "contact" | "deal";
  /** That record's cuid. */
  entityId: string;
  /** Cap the number of entries rendered. Undefined means no cap. */
  limit?: number;
  className?: string;
};

export function ActivityTimeline({ className }: ActivityTimelineProps) {
  return (
    <EmptyState
      icon={History}
      title="No activity yet"
      description="Calls, emails, meetings and notes logged against this record will appear here."
      className={className}
    />
  );
}
