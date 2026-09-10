"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Source } from "@prisma/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * INV-39. "Source toggle for outbound / inbound / all" — URL-param driven
 * like Agent B's <DealsFilters>, so the server component re-fetches with the
 * new filter on navigation and there's no client-side data state to keep in
 * sync. `referral` deals are a third Source value in the schema but the
 * ticket only asks for these three toggle states; they still show up under
 * "All".
 */
const OPTIONS: { value: "all" | Source; label: string }[] = [
  { value: "all", label: "All" },
  { value: "outbound_scan", label: "Outbound" },
  { value: "inbound_signup", label: "Inbound" },
];

export function SourceToggle({ value }: { value?: Source }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setSource(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "all") params.delete("source");
    else params.set("source", v);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Tabs value={value ?? "all"} onValueChange={setSource}>
      <TabsList>
        {OPTIONS.map((o) => (
          <TabsTrigger key={o.value} value={o.value}>
            {o.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
