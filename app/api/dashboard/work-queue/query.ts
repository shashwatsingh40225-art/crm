import { prisma } from "@/lib/db";
import { getStaleDeals, type StaleDeal } from "../stale-deals/query";

/**
 * INV-37 ("My work today"), folding in INV-36 (next_action/next_action_due
 * surfaced with overdue flagged — Agent B owns the inline edit itself, this
 * is a pure read). Read-only — no mutation, so no withActor/audit wrapping
 * applies.
 */

type Reason = "due-today" | "overdue";

export type WorkQueueTask = {
  id: string;
  title: string;
  dueDate: string;
  reason: Reason;
  href: string;
};

export type WorkQueueDeal = {
  id: string;
  name: string;
  companyName: string;
  nextActionDue: string;
  reason: Reason;
  href: string;
};

export type WorkQueue = {
  tasks: WorkQueueTask[];
  nextActionDeals: WorkQueueDeal[];
  staleDeals: StaleDeal[];
  /**
   * INV-59: true only in Mine scope, when this owner has zero Companies,
   * Deals and Tasks — distinct from an empty queue where the owner has
   * records but none are due (or, in Team scope, the pipeline is genuinely
   * empty). Always false in Team scope (`ownerId` undefined).
   */
  ownsNothing: boolean;
};

function reasonFor(due: Date, now: Date): Reason {
  return due.getTime() < now.getTime() ? "overdue" : "due-today";
}

/** End of today (23:59:59.999 local) — the cutoff for "due today". */
function endOfToday(now: Date): Date {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end;
}

function taskHref(task: {
  dealId: string | null;
  contactId: string | null;
  companyId: string | null;
}): string {
  if (task.dealId) return `/deals/${task.dealId}`;
  if (task.contactId) return `/contacts/${task.contactId}`;
  if (task.companyId) return `/companies/${task.companyId}`;
  return "/tasks";
}

/**
 * `ownerId` is the INV-59 Mine/Team scope. Given, this is "my work today" —
 * the original behavior. Omitted, it's the whole team's outstanding work,
 * identical for every viewer.
 */
export async function getWorkQueue(ownerId?: string): Promise<WorkQueue> {
  const now = new Date();
  const cutoff = endOfToday(now);

  const [tasks, deals, staleDeals, ownedCounts] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...(ownerId ? { ownerId } : {}),
        completedAt: null,
        dueDate: { lte: cutoff },
      },
      orderBy: { dueDate: "asc" },
      select: {
        id: true,
        title: true,
        dueDate: true,
        dealId: true,
        contactId: true,
        companyId: true,
      },
    }),
    prisma.deal.findMany({
      where: {
        ...(ownerId ? { ownerId } : {}),
        outcome: null,
        archivedAt: null,
        nextActionDue: { lte: cutoff },
      },
      orderBy: { nextActionDue: "asc" },
      select: {
        id: true,
        name: true,
        nextActionDue: true,
        company: { select: { name: true } },
      },
    }),
    getStaleDeals({ ownerId }),
    ownerId
      ? Promise.all([
          prisma.company.count({ where: { ownerId, archivedAt: null } }),
          prisma.deal.count({ where: { ownerId, archivedAt: null } }),
          prisma.task.count({ where: { ownerId } }),
        ])
      : null,
  ]);

  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      // dueDate can't be null here — the where clause requires it for the lte filter to match.
      dueDate: t.dueDate!.toISOString(),
      reason: reasonFor(t.dueDate!, now),
      href: taskHref(t),
    })),
    nextActionDeals: deals.map((d) => ({
      id: d.id,
      name: d.name,
      companyName: d.company.name,
      nextActionDue: d.nextActionDue!.toISOString(),
      reason: reasonFor(d.nextActionDue!, now),
      href: `/deals/${d.id}`,
    })),
    staleDeals,
    ownsNothing: ownedCounts !== null && ownedCounts.every((c) => c === 0),
  };
}
