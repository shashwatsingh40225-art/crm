"use client";

import { useEffect, useState } from "react";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { CheckSquare } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { format, isPast, isToday } from "date-fns";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingTable } from "@/components/ui/loading";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TaskForm } from "./task-form";

type TaskRow = {
  id: string;
  title: string;
  dueDate: string | null;
  completedAt: string | null;
  owner: { id: string; name: string } | null;
  company: { id: string; name: string } | null;
  contact: { id: string; name: string } | null;
  deal: { id: string; name: string } | null;
};

const STATUS_OPTIONS = ["open", "completed"] as const;

function linkedRecordLabel(task: TaskRow) {
  if (task.company) return `${task.company.name} · Company`;
  if (task.contact) return `${task.contact.name} · Contact`;
  if (task.deal) return `${task.deal.name} · Deal`;
  return null;
}

function isOverdue(task: TaskRow) {
  if (task.completedAt !== null || !task.dueDate) return false;
  const due = new Date(task.dueDate);
  return isPast(due) && !isToday(due);
}

export function TasksView({ currentUserId }: { currentUserId: string }) {
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(STATUS_OPTIONS).withDefault("open"),
  );
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?status=${status}`);
      if (!res.ok) throw new Error();
      const body = (await res.json()) as { data: TaskRow[] };
      setTasks(body.data ?? []);
    } catch {
      toast.error("Couldn't load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const toggleComplete = async (task: TaskRow, completed: boolean) => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error();
      toast.success(completed ? "Task completed" : "Task reopened");
    } catch {
      toast.error("Couldn't update the task");
    } finally {
      load();
    }
  };

  const columns: ColumnDef<TaskRow>[] = [
    {
      id: "complete",
      header: "",
      cell: ({ row }) => (
        <Checkbox
          checked={row.original.completedAt !== null}
          onCheckedChange={(checked) =>
            toggleComplete(row.original, Boolean(checked))
          }
          aria-label={
            row.original.completedAt
              ? `Mark "${row.original.title}" open`
              : `Mark "${row.original.title}" complete`
          }
        />
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const overdue = isOverdue(row.original);
        const linked = linkedRecordLabel(row.original);
        return (
          <div className="grid gap-0.5">
            <span className={cn(overdue && "text-destructive font-medium")}>
              {row.original.title}
            </span>
            {linked ? (
              <span className="text-muted-foreground text-xs">{linked}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "owner",
      header: "Owner",
      cell: ({ row }) => row.original.owner?.name ?? "—",
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) => {
        if (!row.original.dueDate) {
          return <span className="text-muted-foreground">—</span>;
        }
        const overdue = isOverdue(row.original);
        return (
          <span className={cn(overdue && "text-destructive font-medium")}>
            {format(new Date(row.original.dueDate), "MMM d, yyyy")}
            {overdue ? " · Overdue" : ""}
          </span>
        );
      },
    },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as (typeof STATUS_OPTIONS)[number])}
        >
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={() => setFormOpen(true)}>
          New task
        </Button>
      </div>

      {loading ? (
        <LoadingTable rows={6} columns={4} />
      ) : (
        <DataTable
          columns={columns}
          data={tasks}
          emptyState={
            <EmptyState
              icon={CheckSquare}
              title={status === "open" ? "No open tasks" : "No completed tasks"}
              description={
                status === "open"
                  ? "Create a task to track a next action."
                  : "Completed tasks will show up here."
              }
              action={
                status === "open" ? (
                  <Button size="sm" onClick={() => setFormOpen(true)}>
                    New task
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

      <TaskForm
        open={formOpen}
        onOpenChange={setFormOpen}
        currentUserId={currentUserId}
        onCreated={() => {
          setFormOpen(false);
          load();
        }}
      />
    </div>
  );
}
