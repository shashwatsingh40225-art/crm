import { cn } from "@/lib/utils";

/**
 * Title block for a list or detail page (INV-9).
 *
 * `actions` is the right-hand slot for buttons - "New company", "Log activity".
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-border/50",
        className,
      )}
    >
      <div className="grid gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground text-[13px] leading-relaxed">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
