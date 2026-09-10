"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Period } from "@/app/api/dashboard/metrics/query";

/** INV-40. "Period selector: 7 days / 30 days / all", URL-param driven. */
const OPTIONS: { value: Period; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

export function PeriodToggle({ value }: { value: Period }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPeriod(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "30d") params.delete("period");
    else params.set("period", v);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <Tabs value={value} onValueChange={setPeriod}>
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
