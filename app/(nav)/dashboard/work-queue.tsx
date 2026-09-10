import Link from "next/link";
import { CheckSquare, Inbox, ListTodo, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { WorkQueue as WorkQueueData } from "@/app/api/dashboard/work-queue/query";
import { dateFormatter } from "./dashboard-format";
import type { Scope } from "./scope";

/**
 * INV-37 ("My work today") and INV-36 (next_action / next_action_due
 * surfaced here, overdue flagged — the "deals with a next action due or
 * overdue" section below). Three grouped sections, each row stating why it
 * surfaced and linking to its record. Purely presentational — `queue` is
 * already-fetched data from the server component page, same pattern as
 * <MetricTiles>.
 */

function reasonLabel(kind: "task" | "action", overdue: boolean) {
  const noun = kind === "task" ? "task" : "action";
  return overdue ? `${noun} overdue` : `${noun} due today`;
}

function QueueSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        <Icon className="size-3.5" />
        {title}
      </div>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

const REASON_TONE_CLASSES = {
  overdue: "text-destructive",
  stale: "text-amber-700 dark:text-amber-500",
  neutral: "text-muted-foreground",
} as const;

function QueueRow({
  href,
  title,
  subtitle,
  reason,
  tone,
}: {
  href: string;
  title: string;
  subtitle?: string;
  reason: string;
  tone: keyof typeof REASON_TONE_CLASSES;
}) {
  return (
    <Link
      href={href}
      className="hover:border-ring hover:bg-muted/50 flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors"
    >
      <div className="grid gap-0.5">
        <span className="font-medium">{title}</span>
        {subtitle ? (
          <span className="text-muted-foreground text-xs">{subtitle}</span>
        ) : null}
      </div>
      <span
        className={cn(
          "text-xs font-medium whitespace-nowrap",
          REASON_TONE_CLASSES[tone],
        )}
      >
        {reason}
      </span>
    </Link>
  );
}

export function WorkQueue({
  queue,
  scope,
}: {
  queue: WorkQueueData;
  scope: Scope;
}) {
  const isEmpty =
    queue.tasks.length === 0 &&
    queue.nextActionDeals.length === 0 &&
    queue.staleDeals.length === 0;

  if (isEmpty) {
    // INV-59: "owns nothing" (no Companies, Deals or Tasks assigned) is a
    // different empty state from "owns records, none due today" — the
    // latter is what the fallback below covers, in both scopes.
    if (scope === "mine" && queue.ownsNothing) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={Inbox}
              title="Nothing assigned to you yet"
              description="You don't own any companies, deals or tasks. Once something is assigned to you, it'll show up here."
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Inbox}
            title={
              scope === "mine"
                ? "Nothing needs you today"
                : "Nothing needs the team today"
            }
            description="Overdue tasks, deals with a next action due, and stale deals will show up here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-4">
        {queue.tasks.length > 0 ? (
          <QueueSection icon={CheckSquare} title="Tasks">
            {queue.tasks.map((t) => (
              <QueueRow
                key={t.id}
                href={t.href}
                title={t.title}
                subtitle={dateFormatter.format(new Date(t.dueDate))}
                reason={reasonLabel("task", t.reason === "overdue")}
                tone={t.reason === "overdue" ? "overdue" : "neutral"}
              />
            ))}
          </QueueSection>
        ) : null}

        {queue.nextActionDeals.length > 0 ? (
          <QueueSection icon={Target} title="Next action due">
            {queue.nextActionDeals.map((d) => (
              <QueueRow
                key={d.id}
                href={d.href}
                title={d.name}
                subtitle={d.companyName}
                reason={reasonLabel("action", d.reason === "overdue")}
                tone={d.reason === "overdue" ? "overdue" : "neutral"}
              />
            ))}
          </QueueSection>
        ) : null}

        {queue.staleDeals.length > 0 ? (
          <QueueSection icon={ListTodo} title="Stale deals">
            {queue.staleDeals.map((d) => (
              <QueueRow
                key={d.id}
                href={`/deals/${d.id}`}
                title={d.name}
                subtitle={`${d.companyName} · ${d.stageName}`}
                reason={`stale ${d.daysStale} days`}
                tone="stale"
              />
            ))}
          </QueueSection>
        ) : null}
      </CardContent>
    </Card>
  );
}
