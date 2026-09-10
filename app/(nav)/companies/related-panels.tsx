import Link from "next/link";
import { format } from "date-fns";
import type { DealOutcome, LifecycleStage, StageKey } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LifecycleBadge, OutcomeBadge, StageBadge } from "@/components/ui/badges";

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
