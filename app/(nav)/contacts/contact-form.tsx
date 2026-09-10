"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LifecycleStage } from "@prisma/client";
import { ChevronsUpDownIcon, LockIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { contactSchema, type ContactFormValues } from "@/app/api/contacts/schema";

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  prospect: "Prospect",
  lead: "Lead",
  qualified: "Qualified",
  opportunity: "Opportunity",
  customer: "Customer",
  churned: "Churned",
  disqualified: "Disqualified",
};

type CompanyOption = { id: string; name: string; domain: string | null };
type OwnerOption = { id: string; name: string };

/**
 * Shared by app/(nav)/contacts/new and app/(nav)/contacts/[id]/edit
 * (INV-20). Same pattern as CompanyForm (INV-17): same zod schema client and
 * server side, server re-validates.
 *
 * `lockedCompany` is set when this form is launched from a company's detail
 * page (?companyId=...) - the AC requires the company to be pre-filled and
 * un-editable in that case, so the combobox is swapped for a plain locked
 * field rather than merely disabled-but-visible as a dropdown.
 */
export function ContactForm({
  contactId,
  companies,
  owners,
  lockedCompany,
  defaultValues,
}: {
  contactId?: string;
  companies: CompanyOption[];
  owners: OwnerOption[];
  lockedCompany?: CompanyOption;
  defaultValues?: Partial<ContactFormValues>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [companyPickerOpen, setCompanyPickerOpen] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      email: defaultValues?.email ?? "",
      title: defaultValues?.title ?? "",
      phone: defaultValues?.phone ?? "",
      companyId: lockedCompany?.id ?? defaultValues?.companyId ?? "",
      lifecycleStage: defaultValues?.lifecycleStage ?? "lead",
      ownerId: defaultValues?.ownerId ?? "",
    },
  });

  async function onSubmit(values: ContactFormValues) {
    setSubmitting(true);

    const res = await fetch(
      contactId ? `/api/contacts/${contactId}` : "/api/contacts",
      {
        method: contactId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );

    if (!res.ok) {
      setSubmitting(false);
      const body = await res.json().catch(() => null);
      if (res.status === 422 && body?.fields) {
        for (const [field, messages] of Object.entries(
          body.fields as Record<string, string[]>,
        )) {
          form.setError(field as keyof ContactFormValues, {
            message: messages[0],
          });
        }
        return;
      }
      toast.error("Could not save the contact.");
      return;
    }

    const { data } = await res.json();
    toast.success(contactId ? "Contact updated." : "Contact created.");
    router.push(`/contacts/${data.id}`);
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-5 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Dana Whitfield" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Company</FormLabel>
                  {lockedCompany ? (
                    <div className="flex h-8 items-center gap-2 rounded-lg border border-input bg-muted/50 px-2.5 text-sm text-muted-foreground">
                      <LockIcon className="size-3.5" />
                      {lockedCompany.name}
                    </div>
                  ) : (
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
                            {companies.find((c) => c.id === field.value)?.name ??
                              "Search companies..."}
                            <ChevronsUpDownIcon className="opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[320px] p-0">
                        <Command>
                          <CommandInput placeholder="Search companies..." />
                          <CommandList>
                            <CommandEmpty>No company found.</CommandEmpty>
                            <CommandGroup>
                              {companies.map((company) => (
                                <CommandItem
                                  key={company.id}
                                  value={`${company.name} ${company.domain ?? ""}`}
                                  onSelect={() => {
                                    field.onChange(company.id);
                                    setCompanyPickerOpen(false);
                                  }}
                                  data-checked={company.id === field.value}
                                >
                                  {company.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="dana@acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="VP Digital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 503 555 0142" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lifecycleStage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lifecycle stage</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(LIFECYCLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
              name="ownerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select
                    value={field.value || "__unassigned"}
                    onValueChange={(v) =>
                      field.onChange(v === "__unassigned" ? "" : v)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__unassigned">Unassigned</SelectItem>
                      {owners.map((owner) => (
                        <SelectItem key={owner.id} value={owner.id}>
                          {owner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-2 sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                {contactId ? "Save changes" : "Create contact"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
