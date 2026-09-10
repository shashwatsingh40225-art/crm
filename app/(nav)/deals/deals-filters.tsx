"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Source, Stage, User } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const SOURCE_OPTIONS: { value: Source; label: string }[] = [
  { value: "outbound_scan", label: "Outbound scan" },
  { value: "inbound_signup", label: "Inbound signup" },
  { value: "referral", label: "Referral" },
];

/**
 * Stage / owner / source filters for the deal list (INV-25). Filters combine
 * as AND, expressed as URL search params so they survive a refresh and the
 * server component page can read them directly - no client-side filter state
 * to keep in sync.
 */
export function DealsFilters({
  stages,
  owners,
}: {
  stages: Pick<Stage, "id" | "key" | "name">[];
  owners: Pick<User, "id" | "name">[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const hasFilters =
    searchParams.has("stage") ||
    searchParams.has("owner") ||
    searchParams.has("source") ||
    searchParams.has("q");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={searchParams.get("stage") ?? "all"}
        onValueChange={(v) => setParam("stage", v === "all" ? null : v)}
      >
        <SelectTrigger size="sm" aria-label="Filter by stage">
          <SelectValue placeholder="All stages" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All stages</SelectItem>
          {stages.map((s) => (
            <SelectItem key={s.id} value={s.key}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("owner") ?? "all"}
        onValueChange={(v) => setParam("owner", v === "all" ? null : v)}
      >
        <SelectTrigger size="sm" aria-label="Filter by owner">
          <SelectValue placeholder="All owners" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All owners</SelectItem>
          {owners.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("source") ?? "all"}
        onValueChange={(v) => setParam("source", v === "all" ? null : v)}
      >
        <SelectTrigger size="sm" aria-label="Filter by source">
          <SelectValue placeholder="All sources" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {SOURCE_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
