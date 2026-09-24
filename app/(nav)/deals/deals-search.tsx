"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Text search for the deal list (INV-55). Matches on deal name and the
 * related company's name (server-side, in the page's Prisma query) - a rep
 * looking for a deal usually remembers the company, not the deal title.
 * Debounced so typing doesn't push a URL update per keystroke; any change
 * resets `page` back to 1, same as the stage/owner/source filters.
 */
export function DealsSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    setValue(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const trimmed = value.trim();
    const current = searchParams.get("q") ?? "";
    if (trimmed === current) return;

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-64">
      <Search className="text-primary/40 pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search deals or companies…"
        className="pl-7"
        aria-label="Search deals"
      />
    </div>
  );
}
