import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared empty state (INV-9).
 *
 * Every list view uses this rather than rendering its own "No results" string,
 * so an empty Companies table and an empty Deals board read the same way.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="bg-primary/8 text-primary flex size-12 items-center justify-center rounded-full">
          <Icon className="size-5 opacity-80" />
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <p className="font-semibold tracking-tight">{title}</p>
        {description ? (
          <p className="text-muted-foreground max-w-sm text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
