import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getReviewQueueRows } from "./queue";
import { ReviewQueue } from "./review-queue";

export const runtime = "nodejs";

/**
 * Review queue (INV-61). Server component: the queue itself is a plain
 * Prisma read (getReviewQueueRows), same split as every other list page in
 * this app - approve/reject are the only things that need client
 * interactivity, so they're the only client component.
 */
export default async function ReviewPage() {
  const rows = await getReviewQueueRows();

  return (
    <>
      <PageHeader
        title="Review"
        description="Scanned prospects waiting on a human decision. Nothing here reaches the pipeline until someone approves it."
      />
      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nothing waiting on review"
          description="Companies appear here once the scanner ingests findings for them."
        />
      ) : (
        <ReviewQueue rows={rows} />
      )}
    </>
  );
}
