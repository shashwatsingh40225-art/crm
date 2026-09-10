"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CompanySize, LifecycleStage, Source } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  companySchema,
  normalizeDomain,
  type CompanyFormValues,
} from "@/app/api/companies/schema";

const SIZE_LABELS: Record<CompanySize, string> = {
  size_1_10: "1–10",
  size_11_50: "11–50",
  size_51_200: "51–200",
  size_201_1000: "201–1,000",
  size_1000_plus: "1,000+",
};

const SOURCE_LABELS: Record<Source, string> = {
  outbound_scan: "Outbound scan",
  inbound_signup: "Inbound signup",
  referral: "Referral",
};

const LIFECYCLE_LABELS: Record<LifecycleStage, string> = {
  prospect: "Prospect",
  lead: "Lead",
  qualified: "Qualified",
  opportunity: "Opportunity",
  customer: "Customer",
  churned: "Churned",
  disqualified: "Disqualified",
};

type OwnerOption = { id: string; name: string };
type CompanyOption = { id: string; name: string; domain: string | null };

/**
 * Shared by app/(nav)/companies/new and app/(nav)/companies/[id]/edit
 * (INV-17). Same zod schema as the API route - this is presentation only,
 * the server re-validates (CLAUDE.md section 6 / AGENT_CONTRACT.md section 4).
 *
 * `existingCompanies` is only passed by the create route - INV-22's dedupe
 * warning is create-time only, per its own title. Purely a client-side
 * check against the list already fetched for the page; no dedicated API
 * endpoint, since "warn, don't block" doesn't need server enforcement.
 */
export function CompanyForm({
  companyId,
  owners,
  existingCompanies,
  defaultValues,
}: {
  /** Present for edit, undefined for create. */
  companyId?: string;
  owners: OwnerOption[];
  existingCompanies?: CompanyOption[];
  defaultValues?: Partial<CompanyFormValues>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState<CompanyOption | null>(null);
  const pendingValues = useRef<CompanyFormValues | null>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      domain: defaultValues?.domain ?? "",
      industry: defaultValues?.industry ?? "",
      size: defaultValues?.size,
      source: defaultValues?.source ?? "outbound_scan",
      lifecycleStage: defaultValues?.lifecycleStage ?? "prospect",
      ownerId: defaultValues?.ownerId ?? "",
    },
  });

  async function saveCompany(values: CompanyFormValues) {
    setSubmitting(true);

    const res = await fetch(
      companyId ? `/api/companies/${companyId}` : "/api/companies",
      {
        method: companyId ? "PATCH" : "POST",
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
          form.setError(field as keyof CompanyFormValues, {
            message: messages[0],
          });
        }
        return;
      }
      toast.error("Could not save the company.");
      return;
    }

    const { data } = await res.json();
    toast.success(companyId ? "Company updated." : "Company created.");
    router.push(`/companies/${data.id}`);
  }

  async function onSubmit(values: CompanyFormValues) {
    if (!companyId && existingCompanies && values.domain) {
      const normalized = normalizeDomain(values.domain);
      const match = existingCompanies.find(
        (c) => c.domain && normalizeDomain(c.domain) === normalized,
      );
      if (match) {
        pendingValues.current = values;
        setDuplicate(match);
        return;
      }
    }
    await saveCompany(values);
  }

  function createAnyway() {
    setDuplicate(null);
    if (pendingValues.current) void saveCompany(pendingValues.current);
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
                    <Input placeholder="Meridian Outfitters" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain</FormLabel>
                  <FormControl>
                    <Input placeholder="acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Industry</FormLabel>
                  <FormControl>
                    <Input placeholder="Outdoor apparel e-commerce" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select headcount" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(SIZE_LABELS).map(([value, label]) => (
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
                      {Object.entries(SOURCE_LABELS).map(([value, label]) => (
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
                {companyId ? "Save changes" : "Create company"}
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

      <Dialog open={duplicate !== null} onOpenChange={(open) => !open && setDuplicate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>A company with this domain already exists</DialogTitle>
            <DialogDescription>
              {duplicate ? (
                <>
                  <Link
                    href={`/companies/${duplicate.id}`}
                    target="_blank"
                    className="font-medium underline"
                  >
                    {duplicate.name}
                  </Link>{" "}
                  already uses this domain. You can still create this record if
                  it&apos;s a genuinely separate company.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicate(null)}>
              Cancel
            </Button>
            <Button onClick={createAnyway}>Create anyway</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
