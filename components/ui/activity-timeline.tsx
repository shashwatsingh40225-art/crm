"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import {
  History,
  Mail,
  MonitorPlay,
  Phone,
  StickyNote,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import type { ActivityType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * INV-34. Real implementation, replacing the Foundation stub Agents A and B
 * already render on their detail pages — props are unchanged from the stub
 * (AGENT_CONTRACT.md section 5).
 *
 * Also carries INV-33's quick-add: "Log activity" opens a form scoped to the
 * entityType/entityId this instance was mounted with, so the entity is
 * pre-filled and locked by construction rather than by a disabled field.
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

type TimelineActivity = {
  id: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  occurredAt: string;
  createdBy: { id: string; name: string } | null;
};

const TYPE_ICON: Record<ActivityType, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: Users,
  note: StickyNote,
  demo: MonitorPlay,
  signup: UserPlus,
};

const TYPE_LABEL: Record<ActivityType, string> = {
  call: "Call",
  email: "Email",
  meeting: "Meeting",
  note: "Note",
  demo: "Demo",
  signup: "Signup",
};

// The four types an operator logs by hand (INV-33 scope). `demo` and `signup`
// still render in the feed - they arrive from other flows (seed data today).
const LOGGABLE_TYPES = ["call", "email", "meeting", "note"] as const;

const quickAddSchema = z.object({
  type: z.enum(LOGGABLE_TYPES),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  body: z.string().trim().max(5000).optional(),
  occurredAt: z.string().min(1, "Date is required"),
});
type QuickAddValues = z.infer<typeof quickAddSchema>;

function nowLocalInput() {
  return format(new Date(), "yyyy-MM-dd'T'HH:mm");
}

function dayKey(iso: string) {
  return format(new Date(iso), "yyyy-MM-dd");
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
}

function groupByDay(
  activities: TimelineActivity[],
): { key: string; items: TimelineActivity[] }[] {
  const groups: { key: string; items: TimelineActivity[] }[] = [];
  for (const activity of activities) {
    const key = dayKey(activity.occurredAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) {
      last.items.push(activity);
    } else {
      groups.push({ key, items: [activity] });
    }
  }
  return groups;
}

export function ActivityTimeline({
  entityType,
  entityId,
  limit,
  className,
}: ActivityTimelineProps) {
  const pageSize = limit ?? 20;
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPage = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams({
        entityType,
        entityId,
        limit: String(pageSize),
        offset: String(offset),
      });
      const res = await fetch(`/api/activities?${params}`);
      if (!res.ok) throw new Error("Failed to load activity");
      return (await res.json()) as { data: TimelineActivity[]; total: number };
    },
    [entityType, entityId, pageSize],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchPage(0)
      .then(({ data, total: t }) => {
        if (cancelled) return;
        setActivities(data);
        setTotal(t);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { data, total: t } = await fetchPage(activities.length);
      setActivities((prev) => [...prev, ...data]);
      setTotal(t);
    } catch {
      toast.error("Couldn't load more activity");
    } finally {
      setLoadingMore(false);
    }
  };

  const form = useForm<QuickAddValues>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      type: "note",
      subject: "",
      body: "",
      occurredAt: nowLocalInput(),
    },
  });

  const onSubmit = async (values: QuickAddValues) => {
    const payload = {
      type: values.type,
      subject: values.subject,
      body: values.body || undefined,
      occurredAt: new Date(values.occurredAt).toISOString(),
      [`${entityType}Id`]: entityId,
    };

    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      toast.error(errBody?.error ?? "Couldn't log activity");
      return;
    }

    const { data: created } = (await res.json()) as { data: TimelineActivity };
    setActivities((prev) => [created, ...prev]);
    setTotal((t) => t + 1);
    setDialogOpen(false);
    form.reset({
      type: "note",
      subject: "",
      body: "",
      occurredAt: nowLocalInput(),
    });
    toast.success("Activity logged");
  };

  const logButton = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Log activity</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {LOGGABLE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TYPE_LABEL[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="occurredAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>When</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Logging…" : "Log activity"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return (
      <div className={cn("grid gap-2", className)} aria-busy="true">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={History}
        title="Couldn't load activity"
        description="Something went wrong fetching this record's activity."
        className={className}
      />
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No activity yet"
        description="Calls, emails, meetings and notes logged against this record will appear here."
        action={logButton}
        className={className}
      />
    );
  }

  const canLoadMore = !limit && activities.length < total;

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium">
          {total} {total === 1 ? "activity" : "activities"}
        </p>
        {logButton}
      </div>

      {groupByDay(activities).map(({ key, items }) => (
        <div key={key} className="grid gap-2">
          <p className="text-muted-foreground text-xs font-medium">
            {dayLabel(items[0].occurredAt)}
          </p>
          <ul className="grid gap-2">
            {items.map((activity) => {
              const Icon = TYPE_ICON[activity.type];
              return (
                <li
                  key={activity.id}
                  className="flex gap-3 rounded-xl border border-border/40 bg-card p-4 shadow-[0_1px_2px_0_rgb(0_0_0_/_0.03)] transition-all duration-200 hover:border-border/70 hover:shadow-[0_2px_8px_0_rgb(0_0_0_/_0.06)]"
                >
                  <div className="bg-primary/8 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-primary/10">
                    <Icon className="size-3.5" />
                  </div>
                  <div className="grid flex-1 gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium tracking-tight leading-snug">{activity.subject}</p>
                      <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                        {formatDistanceToNow(new Date(activity.occurredAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {activity.body ? (
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {activity.body}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground text-xs font-medium">
                      {TYPE_LABEL[activity.type]} ·{" "}
                      {activity.createdBy?.name ?? "System"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {canLoadMore ? (
        <Button
          variant="outline"
          size="sm"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}
