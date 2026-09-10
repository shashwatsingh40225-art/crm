import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Detail-page field panel (INV-10).
 *
 * <DetailPanel title="Company">
 *   <DetailField label="Domain" value={company.domain} />
 *   <DetailField label="Lifecycle"><LifecycleBadge .../></DetailField>
 * </DetailPanel>
 */
export function DetailPanel({
  title,
  actions,
  children,
  className,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      {title || actions ? (
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          {title ? <CardTitle className="text-base">{title}</CardTitle> : null}
          {actions}
        </CardHeader>
      ) : null}
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</dl>
      </CardContent>
    </Card>
  );
}

/**
 * One label/value pair. Pass `value` for text, or children for a badge or any
 * other node. An empty value renders a muted em dash rather than collapsing,
 * so the field grid stays aligned.
 *
 * `children == null` (INV-50) catches both undefined and null, so the common
 * `{x ? <Badge /> : null}` gets the dash instead of a blank cell. Deliberately
 * not a falsy check: an empty-string child is a real value and renders as-is.
 */
export function DetailField({
  label,
  value,
  children,
  className,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
  className?: string;
}) {
  const hasValue =
    children != null || (value !== null && value !== undefined && value !== "");

  return (
    <div className={cn("grid gap-1", className)}>
      <dt className="text-muted-foreground text-xs font-medium">{label}</dt>
      <dd className="text-sm">
        {hasValue ? (
          (children ?? value)
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </dd>
    </div>
  );
}
