"use client";

import { useQueryState } from "nuqs";
import { parseAsInteger } from "nuqs/server";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "./search-params";

/**
 * Prev/next paging for the company list (INV-52). `<DataTable>` deliberately
 * has no built-in pagination (components/ui/data-table.tsx) - it sorts
 * client-side over whatever rows it's given. Paging happens one level up,
 * against the server-side `total`.
 */
export function PaginationControls({ total, page }: { total: number; page: number }) {
  const [, setPage] = useQueryState(
    "page",
    parseAsInteger.withDefault(1).withOptions({ shallow: false }),
  );

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-sm">
        {total === 0 ? "0 results" : `${start}–${end} of ${total}`}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1 <= 1 ? null : page - 1)}
        >
          Previous
        </Button>
        <span className="text-muted-foreground text-sm">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => setPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
