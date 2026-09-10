"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** List (INV-25) / Board (INV-29) toggle, shared by both views. */
export function DealsViewTabs() {
  const pathname = usePathname();
  const isBoard = pathname === "/deals/board";

  const tabClass = (active: boolean) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
    );

  return (
    <div className="flex w-fit gap-1 rounded-lg border p-1">
      <Link href="/deals" className={tabClass(!isBoard)}>
        List
      </Link>
      <Link href="/deals/board" className={tabClass(isBoard)}>
        Board
      </Link>
    </div>
  );
}
