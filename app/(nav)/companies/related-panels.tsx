import Link from "next/link";
import { format } from "date-fns";
import type {
  DealOutcome,
  FindingConfidence,
  FindingReviewStatus,
  LifecycleStage,
  StageKey,
} from "@prisma/client";
import { ExternalLinkIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { LifecycleBadge, OutcomeBadge, StageBadge } from "@/components/ui/badges";
import { cn } from "@/lib/utils";

/**
 * Related-record rails for the Company (INV-16) and Contact (INV-19) detail
 * pages. Shared here rather than duplicated because both pages render the
 * Deals and Tasks panels; Contacts is company-only.
 *
 * These are association lists, not data tables - they sit alongside the
 * activity timeline and the tasks list as peer sections, so they read as
 * peers rather than one of the four sprouting sort controls.
 *
 * Deal and Task rows are read through the shared Prisma client by the pages
 * that render this (ADR 0002). Nothing here writes, and nothing here reaches
 * into app/(nav)/deals/** or app/(nav)/tasks/**.
 */

export type RelatedContact = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  lifecycleStage: LifecycleStage;
};

export type RelatedDeal = {
  id: string;
  name: string;
  stageKey: StageKey;
  stageName: string;
  /** Converted from Prisma's Decimal by the caller. */
  proposedMrr: number | null;
  outcome: DealOutcome | null;
};

export type RelatedTask = {
  id: string;
  title: string;
  dueDate: Date | null;
  ownerName: string | null;
};

export type RelatedFinding = {
  id: string;
  framework: string;
  observation: string;
  evidenceUrl: string | null;
  confidence: FindingConfidence;
  reviewStatus: FindingReviewStatus;
};

function PanelTitle({ label, count }: { label: string; count: number }) {
  return (
    <CardTitle className="text-base">
      {label}{" "}
      <span className="text-muted-foreground font-normal">{count}</span>
    </CardTitle>
  );
}

export function ContactsPanel({ contacts }: { contacts: RelatedContact[] }) {
  return (
    <Card>
      <CardHeader>
        <PanelTitle label="Contacts" count={contacts.length} />
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <EmptyState title="No contacts yet" />
        ) : (
          <ul className="grid gap-2">
            {contacts.map((contact) => (
              <li key={contact.id}>
                <Link
                  href={`/contacts/${contact.id}`}
                  className="hover:bg-muted/50 grid gap-1 rounded-lg border p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{contact.name}</span>
                    <LifecycleBadge stage={contact.lifecycleStage} />
                  </div>
                  {contact.title ? (
                    <span className="text-muted-foreground text-xs">
                      {contact.title}
                    </span>
                  ) : null}
                  {contact.email ? (
                    <span className="text-muted-foreground text-xs">
                      {contact.email}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DealsPanel({
  deals,
  emptyTitle = "No deals yet",
}: {
  deals: RelatedDeal[];
  emptyTitle?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <PanelTitle label="Deals" count={deals.length} />
      </CardHeader>
      <CardContent>
        {deals.length === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <ul className="grid gap-2">
            {deals.map((deal) => (
              <li key={deal.id}>
                <Link
                  href={`/deals/${deal.id}`}
                  className="hover:bg-muted/50 grid gap-1.5 rounded-lg border p-3"
                >
                  <span className="text-sm font-medium">{deal.name}</span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {deal.outcome ? (
                      <OutcomeBadge outcome={deal.outcome} />
                    ) : (
                      <StageBadge stage={deal.stageKey} label={deal.stageName} />
                    )}
                    {deal.proposedMrr !== null ? (
                      <span className="text-muted-foreground text-xs">
                        ${deal.proposedMrr.toLocaleString()}/mo
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function TasksPanel({ tasks }: { tasks: RelatedTask[] }) {
  return (
    <Card>
      <CardHeader>
        <PanelTitle label="Open tasks" count={tasks.length} />
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <EmptyState title="No open tasks" />
        ) : (
          <ul className="grid gap-2">
            {tasks.map((task) => (
              <li key={task.id} className="grid gap-1 rounded-lg border p-3">
                <span className="text-sm">{task.title}</span>
                <span className="text-muted-foreground text-xs">
                  {task.dueDate ? `Due ${format(task.dueDate, "MMM d")}` : "No due date"}
                  {task.ownerName ? ` · ${task.ownerName}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const CONFIDENCE_LABELS: Record<FindingConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const CONFIDENCE_CLASSES: Record<FindingConfidence, string> = {
  high: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  medium: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

const REVIEW_STATUS_LABELS: Record<FindingReviewStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
};

const REVIEW_STATUS_CLASSES: Record<FindingReviewStatus, string> = {
  pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  rejected: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
};

// Pending first - that's the state someone needs to act on (in /review, not
// here; this panel is read-only). Approved/rejected trail behind in whatever
// order the caller passed them.
const REVIEW_STATUS_ORDER: Record<FindingReviewStatus, number> = {
  pending: 0,
  approved: 1,
  rejected: 1,
};

/**
 * Findings panel on the company detail page (INV-63). Read-only by design -
 * approving and rejecting only happen in /review (Agent D's INV-61). Two
 * places to change the same state is how they drift, so there is no button
 * here that calls app/api/findings/**; the data is a plain read through the
 * shared Prisma client (ADR 0002), same as DealsPanel/TasksPanel above read
 * Agent B's and Agent C's tables.
 *
 * The empty state covers a hand-created company that was never scanned -
 * the common case for seeded/manually-added companies - so it reads as
 * "nothing here yet", not as a broken scan.
 */
export function FindingsPanel({ findings }: { findings: RelatedFinding[] }) {
  const pendingCount = findings.filter((f) => f.reviewStatus === "pending").length;
  const sorted = [...findings].sort(
    (a, b) => REVIEW_STATUS_ORDER[a.reviewStatus] - REVIEW_STATUS_ORDER[b.reviewStatus],
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <PanelTitle label="Findings" count={findings.length} />
        {pendingCount > 0 ? (
          <Badge className={cn("border-transparent font-medium", REVIEW_STATUS_CLASSES.pending)}>
            {pendingCount} pending
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent>
        {findings.length === 0 ? (
          <EmptyState title="No findings yet" description="Nothing here until this prospect is scanned." />
        ) : (
          <ul className="grid gap-2">
            {sorted.map((finding) => (
              <li key={finding.id} className="grid gap-1.5 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium">{finding.framework}</span>
                  <Badge
                    className={cn(
                      "border-transparent font-medium",
                      REVIEW_STATUS_CLASSES[finding.reviewStatus],
                    )}
                  >
                    {REVIEW_STATUS_LABELS[finding.reviewStatus]}
                  </Badge>
                  <Badge
                    className={cn(
                      "border-transparent font-medium",
                      CONFIDENCE_CLASSES[finding.confidence],
                    )}
                  >
                    {CONFIDENCE_LABELS[finding.confidence]}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{finding.observation}</p>
                {finding.evidenceUrl ? (
                  <a
                    href={finding.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex w-fit items-center gap-1 text-xs underline underline-offset-2"
                  >
                    Evidence <ExternalLinkIcon className="size-3.5" />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
