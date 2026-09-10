"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronsUpDown } from "lucide-react";
import type { PlanTier, Source } from "@prisma/client";
import { Button } from "@/components/ui/button";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export type CompanyOption = { id: string; name: string };
export type ContactOption = { id: string; name: string; companyId: string };
export type OwnerOption = { id: string; name: string };

const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: "outbound_scan", label: "Outbound scan" },
  { value: "inbound_signup", label: "Inbound signup" },
  { value: "referral", label: "Referral" },
];

const TIER_OPTIONS: { value: PlanTier; label: string }[] = [
  { value: "starter", label: "Starter · $99/mo" },
  { value: "professional", label: "Professional · $299/mo" },
  { value: "enterprise", label: "Enterprise · $999/mo" },
];

/**
 * Every field is a string at the form layer - native inputs and Radix Select
 * both deal in strings, and normalizing to the real payload types (numbers,
 * nulls, Dates) happens once at submit rather than fighting react-hook-form
 * generics with zod transforms.
 */
const formSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  companyId: z.string().min(1, "Company is required"),
  primaryContactId: z.string(),
  source: z.enum(["outbound_scan", "inbound_signup", "referral"]),
  ownerId: z.string(),
  proposedTier: z.string(),
  proposedMrr: z
    .string()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) > 0), {
      message: "Enter a positive number",
    }),
  nextAction: z.string().max(500),
  nextActionDue: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

type DealFormInitial = {
  id: string;
  name: string;
  companyId: string;
  primaryContactId: string | null;
  source: Source;
  ownerId: string | null;
  proposedTier: PlanTier | null;
  proposedMrr: number | null;
  nextAction: string | null;
  nextActionDue: string | null;
};

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/**
 * Create/edit deal form (INV-27). Same component for both modes: create
 * POSTs to /api/deals, edit PATCHes /api/deals/[id]. Stage is not a field
 * here - creation sets it server-side from `source`, and there is no way to
 * change stage from this form (that goes through the gated transition,
 * INV-28/29/30).
 */
export function DealForm({
  mode,
  deal,
  defaultCompanyId,
  companies,
  contacts,
  owners,
}: {
  mode: "create" | "edit";
  deal?: DealFormInitial;
  defaultCompanyId?: string;
  companies: CompanyOption[];
  contacts: ContactOption[];
  owners: OwnerOption[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: deal?.name ?? "",
      companyId: deal?.companyId ?? defaultCompanyId ?? "",
      primaryContactId: deal?.primaryContactId ?? "",
      source: deal?.source ?? "outbound_scan",
      ownerId: deal?.ownerId ?? "",
      proposedTier: deal?.proposedTier ?? "",
      proposedMrr: deal?.proposedMrr ? String(deal.proposedMrr) : "",
      nextAction: deal?.nextAction ?? "",
      nextActionDue: toDateInputValue(deal?.nextActionDue ?? null),
    },
  });

  const companyId = form.watch("companyId");
  const source = form.watch("source");
  const selectedCompany = companies.find((c) => c.id === companyId);
  const companyContacts = contacts.filter((c) => c.companyId === companyId);

  // A contact belongs to exactly one company - if the user switches company,
  // a previously-picked contact from the old one is no longer valid.
  useEffect(() => {
    const current = form.getValues("primaryContactId");
    if (current && !companyContacts.some((c) => c.id === current)) {
      form.setValue("primaryContactId", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const entryStageLabel = source === "inbound_signup" ? "Engaged" : "Scanned";

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    setFormError(null);

    const payload = {
      name: values.name,
      companyId: values.companyId,
      primaryContactId: values.primaryContactId || null,
      source: values.source,
      ownerId: values.ownerId || null,
      proposedTier: values.proposedTier || null,
      proposedMrr: values.proposedMrr ? Number(values.proposedMrr) : null,
      nextAction: values.nextAction || null,
      nextActionDue: values.nextActionDue
        ? new Date(values.nextActionDue).toISOString()
        : null,
    };

    const res = await fetch(
      mode === "create" ? "/api/deals" : `/api/deals/${deal!.id}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const json = await res.json().catch(() => null);

    if (!res.ok) {
      setSubmitting(false);
      if (json?.fields) {
        for (const [field, messages] of Object.entries(
          json.fields as Record<string, string[]>,
        )) {
          if (field in formSchema.shape) {
            form.setError(field as keyof FormValues, {
              message: messages[0],
            });
          }
        }
      }
      setFormError(json?.error ?? "Something went wrong. Try again.");
      return;
    }

    router.push(`/deals/${json.data.id}`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-xl gap-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Deal name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp — Verena Professional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="companyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company</FormLabel>
              <Popover open={companyPickerOpen} onOpenChange={setCompanyPickerOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={companyPickerOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedCompany ? selectedCompany.name : "Select a company…"}
                      <ChevronsUpDown className="opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                  <Command>
                    <CommandInput placeholder="Search companies…" />
                    <CommandList>
                      <CommandEmpty>No company found.</CommandEmpty>
                      <CommandGroup>
                        {companies.map((c) => (
                          <CommandItem
                            key={c.id}
                            value={c.name}
                            data-checked={c.id === field.value}
                            onSelect={() => {
                              field.onChange(c.id);
                              setCompanyPickerOpen(false);
                            }}
                          >
                            {c.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="primaryContactId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary contact</FormLabel>
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                disabled={!companyId}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        companyId ? "No primary contact" : "Pick a company first"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">No primary contact</SelectItem>
                  {companyContacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companyId && companyContacts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  This company has no contacts yet.
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="source"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Source</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SOURCE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {mode === "create" ? (
                <p className="text-muted-foreground text-sm">
                  Enters the pipeline at <span className="font-medium">{entryStageLabel}</span>.
                  Stage changes after that happen from the deal page or board.
                </p>
              ) : null}
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
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {owners.map((o) => (
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="proposedTier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proposed tier</FormLabel>
                <Select
                  value={field.value || "none"}
                  onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Not proposed yet" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Not proposed yet</SelectItem>
                    {TIER_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
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
            name="proposedMrr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proposed MRR (USD)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder="299" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="nextAction"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next action</FormLabel>
              <FormControl>
                <Input placeholder="Send the WCAG findings summary" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="nextActionDue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Next action due</FormLabel>
              <FormControl>
                <Input type="date" className="w-fit" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formError ? (
          <p className="text-destructive text-sm">{formError}</p>
        ) : null}

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "Saving…"
              : mode === "create"
                ? "Create deal"
                : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
