"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type LinkOption = { id: string; name: string };
type LinkOptions = {
  companies: LinkOption[];
  contacts: LinkOption[];
  deals: LinkOption[];
  owners: LinkOption[];
};

const LINK_TYPES = ["none", "company", "contact", "deal"] as const;

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  dueDate: z.date().optional(),
  ownerId: z.string().optional(),
  linkType: z.enum(LINK_TYPES),
  linkId: z.string().optional(),
});
type Values = z.infer<typeof schema>;

/** INV-35. "Standalone" is the primary path; "from a record" is satisfied by
 * the link-to-a-record picker below rather than a widget embedded on
 * Company/Contact/Deal detail pages, which don't exist in this build yet
 * (Agent A/B own those directories and haven't merged their detail-page
 * slices). Flagged in the checkpoint summary. */
export function TaskForm({
  open,
  onOpenChange,
  currentUserId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string;
  onCreated: () => void;
}) {
  const [options, setOptions] = useState<LinkOptions | null>(null);

  useEffect(() => {
    if (!open || options) return;
    fetch("/api/tasks/link-options")
      .then((res) => res.json())
      .then((body) => setOptions(body.data))
      .catch(() => toast.error("Couldn't load companies, contacts and deals"));
  }, [open, options]);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      ownerId: currentUserId,
      linkType: "none",
      linkId: undefined,
    },
  });

  const linkType = form.watch("linkType");
  const linkChoices =
    linkType === "company"
      ? options?.companies
      : linkType === "contact"
        ? options?.contacts
        : linkType === "deal"
          ? options?.deals
          : undefined;

  const onSubmit = async (values: Values) => {
    const payload: Record<string, unknown> = {
      title: values.title,
      dueDate: values.dueDate?.toISOString(),
      ownerId: values.ownerId,
    };
    if (values.linkType !== "none" && values.linkId) {
      payload[`${values.linkType}Id`] = values.linkId;
    }

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Couldn't create the task");
      return;
    }

    toast.success("Task created");
    form.reset({
      title: "",
      ownerId: currentUserId,
      linkType: "none",
      linkId: undefined,
    });
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon />
                          {field.value
                            ? format(field.value, "MMM d, yyyy")
                            : "No due date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(options?.owners ?? []).map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="linkType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("linkId", undefined);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nothing</SelectItem>
                        <SelectItem value="company">Company</SelectItem>
                        <SelectItem value="contact">Contact</SelectItem>
                        <SelectItem value="deal">Deal</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Record</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={linkType === "none" || !linkChoices}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(linkChoices ?? []).map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating…" : "Create task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
